use std::path::PathBuf;
use std::sync::Arc;

use crate::core::clock::Clock;
use crate::core::error::DoreResult;
use crate::core::ids::IdFactory;
use crate::jobs::reporter::{JobReport, JobStatus};
use crate::storage::job_log_repository::JobLogRepositoryPort;
use crate::storage::raw_evidence_repository::RawEvidenceRepositoryPort;
use crate::storage::wiki_repository::WikiRepositoryPort;
use crate::wiki::renderer::MarkdownRenderer;

#[derive(Debug, Clone, Default)]
pub struct WikiGenerateRequest;

#[derive(Debug, Clone)]
pub struct WikiGenerateResult {
    pub job_id: String,
    pub index_path: PathBuf,
    pub log_path: PathBuf,
    pub evidence_ids: Vec<String>,
    pub job_report_path: PathBuf,
}

pub struct WikiGenerationService {
    raw_repo: Arc<dyn RawEvidenceRepositoryPort>,
    wiki_repo: Arc<dyn WikiRepositoryPort>,
    job_log: Arc<dyn JobLogRepositoryPort>,
    renderer: MarkdownRenderer,
    clock: Arc<dyn Clock>,
    ids: Arc<dyn IdFactory>,
}

impl WikiGenerationService {
    pub fn new(
        raw_repo: Arc<dyn RawEvidenceRepositoryPort>,
        wiki_repo: Arc<dyn WikiRepositoryPort>,
        job_log: Arc<dyn JobLogRepositoryPort>,
        clock: Arc<dyn Clock>,
        ids: Arc<dyn IdFactory>,
    ) -> Self {
        Self {
            raw_repo,
            wiki_repo,
            job_log,
            renderer: MarkdownRenderer::new(),
            clock,
            ids,
        }
    }

    pub fn generate(&self, _request: WikiGenerateRequest) -> DoreResult<WikiGenerateResult> {
        let started_at = self.clock.now();
        let job_id = self.ids.job_id(started_at, "wiki");

        let records = self.raw_repo.list_metadata()?;
        let evidence_ids: Vec<String> =
            records.iter().map(|r| r.evidence_id.clone()).collect();

        let index_body = self.renderer.render_index(started_at, &records);
        let index_path = self.wiki_repo.write_index(&index_body)?;

        let collector = records
            .first()
            .map(|r| r.provenance.collector.clone())
            .unwrap_or_else(|| "manual_cli".to_string());

        let outputs = vec![
            "memory/wiki/index.md".to_string(),
            "memory/wiki/log.md".to_string(),
        ];

        let log_entry = self.renderer.render_log_entry(
            started_at,
            &job_id,
            &evidence_ids,
            &outputs,
            &collector,
        );
        let log_path = self.wiki_repo.append_log(&log_entry)?;

        // Record this run's outputs back into each evidence metadata entry so
        // `generated_outputs` reflects the wiki pages derived from it. This
        // closes the loop between raw evidence and downstream artifacts and
        // is required for traceability.
        for evidence_id in &evidence_ids {
            self.raw_repo
                .record_generated_outputs(evidence_id, &outputs)?;
        }

        let finished_at = self.clock.now();
        let report = JobReport::new(
            &job_id,
            "wiki_generate",
            JobStatus::Succeeded,
            started_at,
            finished_at,
        )
        .with_inputs(evidence_ids.clone())
        .with_outputs(outputs);
        let job_report_path = self.job_log.append("wiki_generate", &report)?;

        Ok(WikiGenerateResult {
            job_id,
            index_path,
            log_path,
            evidence_ids,
            job_report_path,
        })
    }
}
