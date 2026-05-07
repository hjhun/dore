use std::io::{Read, Write};
use std::path::PathBuf;
use std::process::ExitCode;
use std::sync::Arc;

use clap::{Args, Parser, Subcommand};

use crate::core::clock::{Clock, SystemClock};
use crate::core::error::{DoreError, DoreResult};
use crate::core::ids::{FsJobIdAllocator, IdFactory, JobIdAllocator, SequentialIdFactory};
use crate::graphify::availability::{
    GraphifyAvailabilityChecker, GraphifyStatusReport, SystemCommandProbe,
};
use crate::ingest::normalizer::EvidenceNormalizer;
use crate::ingest::service::{IngestRequest, IngestSourceKind, IngestionService};
use crate::jobs::reporter::{JobReport, JobStatus};
use crate::policy::defaults::PolicyDefaults;
use crate::policy::engine::PolicyEngine;
use crate::policy::model::SyncMode;
use crate::runtime::init::{RuntimeInitializer, RuntimeInitializerPort};
use crate::runtime::layout::{resolve_runtime_root, RuntimeLayout};
use crate::storage::artifact_store::atomic_write;
use crate::storage::job_log_repository::{JobLogRepository, JobLogRepositoryPort};
use crate::storage::raw_evidence_repository::RawEvidenceRepository;
use crate::storage::wiki_repository::WikiRepository;
use crate::wiki::generator::{WikiGenerateRequest, WikiGenerationService};

#[derive(Parser, Debug)]
#[command(
    name = "dore",
    version,
    about = "Dore local-only LLM Wiki scaffold for personal memory"
)]
pub struct DoreCli {
    #[command(subcommand)]
    command: TopCommand,
}

#[derive(Subcommand, Debug)]
enum TopCommand {
    /// Initialize the private runtime memory layout.
    Init(InitArgs),
    /// Ingest manually supplied notes or conversation summaries.
    Ingest(IngestArgs),
    /// Wiki commands.
    #[command(subcommand)]
    Wiki(WikiCommand),
    /// Graphify commands.
    #[command(subcommand)]
    Graphify(GraphifyCommand),
}

#[derive(Subcommand, Debug)]
enum WikiCommand {
    /// Generate or update the local wiki from ingested evidence.
    Generate(WikiGenerateArgs),
}

#[derive(Subcommand, Debug)]
enum GraphifyCommand {
    /// Report whether Graphify is installed, invokable, or unavailable.
    Check(GraphifyCheckArgs),
}

#[derive(Args, Debug)]
struct InitArgs {
    #[arg(long, value_name = "PATH")]
    runtime_root: Option<PathBuf>,
}

#[derive(Args, Debug)]
struct IngestArgs {
    #[arg(long, value_parser = ["note", "conversation-summary", "conversation_summary"])]
    kind: String,

    #[arg(long)]
    title: String,

    #[arg(long, conflicts_with = "stdin")]
    file: Option<PathBuf>,

    #[arg(long, default_value_t = false)]
    stdin: bool,

    #[arg(long, value_name = "PATH")]
    runtime_root: Option<PathBuf>,

    #[arg(long, default_value = "local-only", value_parser = ["local-only", "cloud", "export"])]
    sync_mode: String,

    #[arg(long, default_value_t = false)]
    approve: bool,

    #[arg(long, default_value = "sensitive")]
    sensitivity: String,
}

#[derive(Args, Debug)]
struct WikiGenerateArgs {
    #[arg(long, value_name = "PATH")]
    runtime_root: Option<PathBuf>,
}

#[derive(Args, Debug)]
struct GraphifyCheckArgs {
    #[arg(long, value_name = "PATH")]
    runtime_root: Option<PathBuf>,
}

/// Run with arguments from the process environment.
pub fn run_from_env() -> ExitCode {
    let cli = DoreCli::parse();
    let mut stdout = std::io::stdout().lock();
    let mut stderr = std::io::stderr().lock();
    match dispatch(cli, &mut stdout, &mut stderr) {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            let _ = writeln!(stderr, "error ({}): {err}", err.code());
            ExitCode::from(1)
        }
    }
}

/// Run with provided arguments. Useful from integration tests.
pub fn run_with_args<I, T, W, E>(args: I, stdout: &mut W, stderr: &mut E) -> DoreResult<()>
where
    I: IntoIterator<Item = T>,
    T: Into<std::ffi::OsString> + Clone,
    W: Write,
    E: Write,
{
    let cli = DoreCli::try_parse_from(args).map_err(|err| DoreError::InvalidInput {
        field: "argv".into(),
        reason: err.to_string(),
    })?;
    dispatch(cli, stdout, stderr)
}

fn dispatch<W: Write, E: Write>(cli: DoreCli, stdout: &mut W, stderr: &mut E) -> DoreResult<()> {
    match cli.command {
        TopCommand::Init(args) => run_init(args, stdout),
        TopCommand::Ingest(args) => run_ingest(args, stdout, stderr),
        TopCommand::Wiki(WikiCommand::Generate(args)) => run_wiki_generate(args, stdout),
        TopCommand::Graphify(GraphifyCommand::Check(args)) => run_graphify_check(args, stdout),
    }
}

fn build_layout(runtime_root: Option<&PathBuf>) -> DoreResult<RuntimeLayout> {
    let resolved = resolve_runtime_root(runtime_root.map(|p| p.as_path()));
    RuntimeLayout::new(resolved)
}

fn ensure_initialized(layout: &RuntimeLayout) -> DoreResult<()> {
    RuntimeInitializer::new().init(layout).map(|_| ())
}

fn run_init<W: Write>(args: InitArgs, stdout: &mut W) -> DoreResult<()> {
    let layout = build_layout(args.runtime_root.as_ref())?;
    let result = RuntimeInitializer::new().init(&layout)?;
    writeln!(
        stdout,
        "Initialized runtime root: {}",
        result.runtime_root.display()
    )
    .ok();
    if !result.created_paths.is_empty() {
        writeln!(stdout, "Created {} paths.", result.created_paths.len()).ok();
    }
    if !result.already_present.is_empty() {
        writeln!(
            stdout,
            "{} paths already present.",
            result.already_present.len()
        )
        .ok();
    }
    let defaults_state = if result.policy_defaults_written {
        "wrote"
    } else {
        "preserved"
    };
    writeln!(
        stdout,
        "Policy defaults: {} {}",
        defaults_state,
        result.policy_defaults_path.display(),
    )
    .ok();
    writeln!(
        stdout,
        "Policy snapshot: refreshed {}",
        result.policy_snapshot_path.display(),
    )
    .ok();
    Ok(())
}

fn run_ingest<W: Write, E: Write>(
    args: IngestArgs,
    stdout: &mut W,
    _stderr: &mut E,
) -> DoreResult<()> {
    let layout = build_layout(args.runtime_root.as_ref())?;
    ensure_initialized(&layout)?;

    let kind = IngestSourceKind::parse(&args.kind)?;
    let payload = read_payload(args.file.as_ref(), args.stdin)?;
    let sync_mode = parse_sync_mode(&args.sync_mode)?;
    let source_label = if args.stdin {
        "stdin".to_string()
    } else if let Some(p) = args.file.as_ref() {
        format!("file:{}", p.display())
    } else {
        return Err(DoreError::InvalidInput {
            field: "input".into(),
            reason: "either --file or --stdin must be provided".into(),
        });
    };

    let clock: Arc<dyn Clock> = Arc::new(SystemClock);
    let ids: Arc<dyn IdFactory> = Arc::new(SequentialIdFactory::new());
    let job_ids: Arc<dyn JobIdAllocator> = Arc::new(FsJobIdAllocator::new(layout.clone()));
    let defaults = PolicyDefaults::embedded()?;
    let policy = Arc::new(PolicyEngine::new(defaults, clock.clone(), ids.clone()));
    let normalizer = EvidenceNormalizer::new(clock.clone(), ids.clone());
    let raw_repo = Arc::new(RawEvidenceRepository::new(layout.clone()));
    let job_log = Arc::new(JobLogRepository::new(layout.clone()));
    let service = IngestionService::new(
        policy,
        normalizer,
        raw_repo,
        job_log,
        clock.clone(),
        job_ids,
    );

    let request = IngestRequest {
        kind,
        title: args.title,
        payload,
        sync_mode,
        approval_granted: args.approve,
        sensitivity: args.sensitivity,
        source_label,
        provenance_note: None,
    };

    let result = service.ingest(request)?;
    writeln!(
        stdout,
        "Ingested evidence {} (job {}) under {}.",
        result.stored.metadata.evidence_id,
        result.job_id,
        result.stored.payload_path.display()
    )
    .ok();
    Ok(())
}

fn run_wiki_generate<W: Write>(args: WikiGenerateArgs, stdout: &mut W) -> DoreResult<()> {
    let layout = build_layout(args.runtime_root.as_ref())?;
    ensure_initialized(&layout)?;

    let clock: Arc<dyn Clock> = Arc::new(SystemClock);
    let job_ids: Arc<dyn JobIdAllocator> = Arc::new(FsJobIdAllocator::new(layout.clone()));
    let raw_repo = Arc::new(RawEvidenceRepository::new(layout.clone()));
    let wiki_repo = Arc::new(WikiRepository::new(layout.clone()));
    let job_log = Arc::new(JobLogRepository::new(layout.clone()));
    let service = WikiGenerationService::new(raw_repo, wiki_repo, job_log, clock, job_ids);
    let result = service.generate(WikiGenerateRequest)?;
    writeln!(
        stdout,
        "Wiki generated: index={}, log={}, evidence={} record(s).",
        result.index_path.display(),
        result.log_path.display(),
        result.evidence_ids.len(),
    )
    .ok();
    Ok(())
}

fn run_graphify_check<W: Write>(args: GraphifyCheckArgs, stdout: &mut W) -> DoreResult<()> {
    let layout = build_layout(args.runtime_root.as_ref())?;
    ensure_initialized(&layout)?;

    let clock: Arc<dyn Clock> = Arc::new(SystemClock);
    let job_ids: Arc<dyn JobIdAllocator> = Arc::new(FsJobIdAllocator::new(layout.clone()));
    let probe = Arc::new(SystemCommandProbe::new());
    let checker = GraphifyAvailabilityChecker::new(probe);

    let started_at = clock.now();
    let job_id = job_ids.allocate(started_at, "graphify_check")?;

    let report = checker.check()?;
    let finished_at = clock.now();

    let status = format!("{:?}", report.status).to_lowercase();
    writeln!(stdout, "Graphify status: {} ({})", status, report.message).ok();

    // Persist a status snapshot under memory/graph/status/<job>.json.
    let status_dir = layout.graph_status_dir();
    let status_path = status_dir.join(format!("{job_id}.json"));
    let body = serde_json::to_vec_pretty(&GraphifyStatusReportEnvelope {
        job_id: job_id.clone(),
        report: report.clone(),
    })
    .map_err(|err| DoreError::Serialization {
        format: "json".into(),
        message: err.to_string(),
    })?;
    atomic_write(&status_path, &body)?;

    let job_status = match report.status {
        crate::graphify::GraphifyStatus::Installed => JobStatus::Installed,
        crate::graphify::GraphifyStatus::Invokable => JobStatus::Invokable,
        crate::graphify::GraphifyStatus::Unavailable => JobStatus::Unavailable,
    };
    let detail = serde_json::to_value(&report).ok();
    let mut job_report = JobReport::new(
        job_id,
        "graphify_check",
        job_status,
        started_at,
        finished_at,
    )
    .with_outputs(vec![format!(
        "memory/graph/status/{}.json",
        status_path
            .file_stem()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default()
    )]);
    if let Some(d) = detail {
        job_report = job_report.with_detail(d);
    }
    JobLogRepository::new(layout).append("graphify_check", &job_report)?;

    Ok(())
}

#[derive(serde::Serialize)]
struct GraphifyStatusReportEnvelope {
    job_id: String,
    #[serde(flatten)]
    report: GraphifyStatusReport,
}

fn read_payload(file: Option<&PathBuf>, use_stdin: bool) -> DoreResult<Vec<u8>> {
    if use_stdin {
        let mut buf = Vec::new();
        std::io::stdin()
            .read_to_end(&mut buf)
            .map_err(|source| DoreError::Io {
                path: PathBuf::from("<stdin>"),
                source,
            })?;
        return Ok(buf);
    }
    if let Some(path) = file {
        return std::fs::read(path).map_err(|source| DoreError::Io {
            path: path.clone(),
            source,
        });
    }
    Err(DoreError::InvalidInput {
        field: "input".into(),
        reason: "either --file or --stdin must be provided".into(),
    })
}

fn parse_sync_mode(value: &str) -> DoreResult<SyncMode> {
    match value {
        "local-only" | "local_only" => Ok(SyncMode::LocalOnly),
        "cloud" => Ok(SyncMode::Cloud),
        "export" => Ok(SyncMode::Export),
        other => Err(DoreError::InvalidInput {
            field: "sync_mode".into(),
            reason: format!("unknown sync mode {other}"),
        }),
    }
}
