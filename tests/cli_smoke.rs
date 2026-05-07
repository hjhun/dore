use std::ffi::OsString;
use std::path::Path;

use dore::cli::run_with_args;

fn dore_args(args: &[&str]) -> Vec<OsString> {
    let mut v = Vec::with_capacity(args.len() + 1);
    v.push(OsString::from("dore"));
    for a in args {
        v.push(OsString::from(*a));
    }
    v
}

fn run_cli(args: &[&str]) -> (String, String, dore::core::error::DoreResult<()>) {
    let mut stdout = Vec::<u8>::new();
    let mut stderr = Vec::<u8>::new();
    let result = run_with_args(dore_args(args), &mut stdout, &mut stderr);
    (
        String::from_utf8_lossy(&stdout).to_string(),
        String::from_utf8_lossy(&stderr).to_string(),
        result,
    )
}

fn write_payload(dir: &Path, name: &str, contents: &str) -> std::path::PathBuf {
    let path = dir.join(name);
    std::fs::write(&path, contents).unwrap();
    path
}

#[test]
fn init_creates_idempotent_runtime_layout() {
    let tmp = tempfile::TempDir::new().unwrap();
    let root = tmp.path().join("runtime");
    let root_str = root.display().to_string();

    let (stdout, _, result) = run_cli(&["init", "--runtime-root", &root_str]);
    result.unwrap();
    assert!(stdout.contains("Initialized runtime root"));
    assert!(root.join("memory/wiki").is_dir());
    assert!(root.join("memory/raw/notes").is_dir());
    assert!(root.join("memory/jobs").is_dir());
    assert!(root.join("memory/graph/status").is_dir());

    // The default policy snapshot must be visible on disk after init.
    let defaults_toml = root.join("memory/policy/defaults.toml");
    let snapshot_json = root.join("memory/policy/snapshot.json");
    assert!(defaults_toml.is_file(), "defaults.toml missing");
    assert!(snapshot_json.is_file(), "snapshot.json missing");
    assert!(stdout.contains("Policy defaults:"));
    assert!(stdout.contains("Policy snapshot:"));

    let toml_text = std::fs::read_to_string(&defaults_toml).unwrap();
    assert!(toml_text.contains("local_only = true"));
    assert!(toml_text.contains("cloud_sync_enabled = false"));

    let snapshot: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&snapshot_json).unwrap()).unwrap();
    assert_eq!(snapshot["local_only"], true);
    assert_eq!(snapshot["sync"]["cloud_sync_enabled"], false);

    // Place an existing payload to ensure idempotent re-init does not destroy state.
    let existing = root.join("memory/wiki/marker.txt");
    std::fs::write(&existing, "do not delete").unwrap();

    // User-edited defaults.toml must survive a re-init.
    std::fs::write(&defaults_toml, "user_edit = true\n").unwrap();

    let (_, _, second) = run_cli(&["init", "--runtime-root", &root_str]);
    second.unwrap();
    assert_eq!(std::fs::read_to_string(&existing).unwrap(), "do not delete");
    assert_eq!(
        std::fs::read_to_string(&defaults_toml).unwrap(),
        "user_edit = true\n"
    );
    // The JSON snapshot is regenerated each time so it always reflects the
    // embedded defaults the binary is enforcing.
    let refreshed: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&snapshot_json).unwrap()).unwrap();
    assert_eq!(refreshed["local_only"], true);
}

#[test]
fn fast_consecutive_ingests_produce_distinct_evidence_ids() {
    let tmp = tempfile::TempDir::new().unwrap();
    let root = tmp.path().join("runtime");
    let root_str = root.display().to_string();
    run_cli(&["init", "--runtime-root", &root_str]).2.unwrap();

    let payload = write_payload(tmp.path(), "note.md", "# Same content\n");
    let payload_str = payload.display().to_string();

    // Drive several ingests back-to-back inside the same wall-clock second.
    // Each invocation runs in-process here, but the SequentialIdFactory is
    // recreated per invocation just like a fresh CLI process. Without the
    // disk-aware id resolution this would either error with an append-only
    // violation or overwrite the previous entry.
    for _ in 0..5 {
        let (stdout, _stderr, result) = run_cli(&[
            "ingest",
            "--kind",
            "note",
            "--title",
            "Rapid fire",
            "--file",
            &payload_str,
            "--runtime-root",
            &root_str,
        ]);
        result.unwrap_or_else(|err| panic!("ingest failed: {err}; stdout={stdout}"));
    }

    let metadata_dir = root.join("memory/raw/index");
    let mut ids: Vec<String> = std::fs::read_dir(&metadata_dir)
        .unwrap()
        .map(|e| {
            e.unwrap()
                .path()
                .file_stem()
                .unwrap()
                .to_string_lossy()
                .into_owned()
        })
        .collect();
    ids.sort();
    ids.dedup();
    assert_eq!(ids.len(), 5, "expected 5 distinct evidence ids: {ids:?}");

    // Each notes payload file should also be present and unique.
    let notes_dir = root.join("memory/raw/notes");
    let payloads: std::collections::HashSet<String> = walkdir(&notes_dir)
        .filter(|p| p.extension().and_then(|s| s.to_str()) == Some("md"))
        .map(|p| p.file_name().unwrap().to_string_lossy().into_owned())
        .collect();
    assert_eq!(
        payloads.len(),
        5,
        "expected 5 distinct payload files, got {payloads:?}"
    );

    // Ingest job log preserved every entry append-only.
    let log = std::fs::read_to_string(root.join("memory/jobs/ingest.jsonl")).unwrap();
    assert_eq!(log.lines().count(), 5);
}

#[test]
fn ingest_note_then_generate_wiki_records_provenance() {
    let tmp = tempfile::TempDir::new().unwrap();
    let root = tmp.path().join("runtime");
    let root_str = root.display().to_string();

    run_cli(&["init", "--runtime-root", &root_str]).2.unwrap();

    let payload = write_payload(tmp.path(), "note.md", "# Test note\n\nbody.\n");
    let payload_str = payload.display().to_string();

    let (stdout, _, result) = run_cli(&[
        "ingest",
        "--kind",
        "note",
        "--title",
        "Project note",
        "--file",
        &payload_str,
        "--runtime-root",
        &root_str,
    ]);
    result.unwrap();
    assert!(stdout.contains("Ingested evidence"));

    let ingest_log = root.join("memory/jobs/ingest.jsonl");
    let log_text = std::fs::read_to_string(&ingest_log).unwrap();
    let lines: Vec<&str> = log_text.lines().collect();
    assert_eq!(lines.len(), 1);
    assert!(lines[0].contains("\"status\":\"succeeded\""));
    assert!(lines[0].contains("\"job_kind\":\"ingest\""));

    // Check there's exactly one metadata file under the index dir.
    let index_dir = root.join("memory/raw/index");
    let metadata_entries: Vec<_> = std::fs::read_dir(&index_dir).unwrap().collect();
    assert_eq!(metadata_entries.len(), 1);

    // Generate wiki.
    let (wiki_stdout, _, wiki_result) =
        run_cli(&["wiki", "generate", "--runtime-root", &root_str]);
    wiki_result.unwrap();
    assert!(wiki_stdout.contains("Wiki generated"));

    let index = std::fs::read_to_string(root.join("memory/wiki/index.md")).unwrap();
    assert!(index.contains("Project note"));
    assert!(index.contains("Provenance: manual_cli"));
    assert!(index.contains("[[evi_"));
    assert!(index.contains("Payload SHA-256:"));

    let log_md = std::fs::read_to_string(root.join("memory/wiki/log.md")).unwrap();
    assert!(log_md.contains("wiki_generate"));
    assert!(log_md.contains("Provenance: manual_cli"));

    // Run wiki generate a second time to confirm append-only log behavior.
    run_cli(&["wiki", "generate", "--runtime-root", &root_str]).2.unwrap();
    let log_md_after = std::fs::read_to_string(root.join("memory/wiki/log.md")).unwrap();
    assert!(
        log_md_after.len() > log_md.len(),
        "log.md should grow on re-run, before={} after={}",
        log_md.len(),
        log_md_after.len()
    );

    // Wiki generate job log preserved both runs.
    let wiki_log = std::fs::read_to_string(root.join("memory/jobs/wiki_generate.jsonl")).unwrap();
    assert_eq!(wiki_log.lines().count(), 2);

    // After wiki generation each evidence record should have its
    // generated_outputs populated with both wiki paths.
    let metadata_dir = root.join("memory/raw/index");
    let mut found_outputs = false;
    for entry in std::fs::read_dir(&metadata_dir).unwrap() {
        let path = entry.unwrap().path();
        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        let value: serde_json::Value =
            serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
        let outputs = value["generated_outputs"]
            .as_array()
            .expect("generated_outputs array");
        let collected: Vec<String> = outputs
            .iter()
            .map(|v| v.as_str().unwrap().to_string())
            .collect();
        assert!(
            collected.contains(&"memory/wiki/index.md".to_string()),
            "evidence metadata missing index.md output: {collected:?}",
        );
        assert!(
            collected.contains(&"memory/wiki/log.md".to_string()),
            "evidence metadata missing log.md output: {collected:?}",
        );
        // Re-run should not double-list outputs.
        assert_eq!(collected.len(), 2, "outputs should dedupe across runs: {collected:?}");
        found_outputs = true;
    }
    assert!(found_outputs, "expected at least one evidence metadata file");
}

#[test]
fn ingest_conversation_summary_is_classified_correctly() {
    let tmp = tempfile::TempDir::new().unwrap();
    let root = tmp.path().join("runtime");
    let root_str = root.display().to_string();
    run_cli(&["init", "--runtime-root", &root_str]).2.unwrap();

    let payload = write_payload(tmp.path(), "conv.md", "Summary of a chat\n");
    let payload_str = payload.display().to_string();

    let (_, _, result) = run_cli(&[
        "ingest",
        "--kind",
        "conversation-summary",
        "--title",
        "Daily standup recap",
        "--file",
        &payload_str,
        "--runtime-root",
        &root_str,
    ]);
    result.unwrap();

    let conv_dir = root.join("memory/raw/conversations");
    let mut found_payload = false;
    for entry in walkdir(&conv_dir) {
        if entry.extension().and_then(|s| s.to_str()) == Some("md") {
            found_payload = true;
            break;
        }
    }
    assert!(found_payload, "expected a .md payload under memory/raw/conversations");

    let index_dir = root.join("memory/raw/index");
    let metadata_path = std::fs::read_dir(&index_dir)
        .unwrap()
        .next()
        .unwrap()
        .unwrap()
        .path();
    let metadata: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&metadata_path).unwrap()).unwrap();
    assert_eq!(metadata["source_kind"], "conversation_summary");
    assert_eq!(metadata["data_category"], "manual_conversation_summary");
}

#[test]
fn ingest_with_cloud_sync_is_denied_and_no_raw_payload_written() {
    let tmp = tempfile::TempDir::new().unwrap();
    let root = tmp.path().join("runtime");
    let root_str = root.display().to_string();
    run_cli(&["init", "--runtime-root", &root_str]).2.unwrap();

    let payload = write_payload(tmp.path(), "note.md", "should not be stored\n");
    let payload_str = payload.display().to_string();

    let (_, _, result) = run_cli(&[
        "ingest",
        "--kind",
        "note",
        "--title",
        "Forbidden",
        "--file",
        &payload_str,
        "--sync-mode",
        "cloud",
        "--runtime-root",
        &root_str,
    ]);
    let err = result.unwrap_err();
    match err {
        dore::core::error::DoreError::PolicyDenied { reason, .. } => {
            assert!(reason.contains("cloud"));
        }
        other => panic!("expected PolicyDenied, got {other:?}"),
    }

    // No raw payload should have been written.
    let notes_dir = root.join("memory/raw/notes");
    let payload_count = walkdir(&notes_dir)
        .filter(|p| p.extension().and_then(|s| s.to_str()) == Some("md"))
        .count();
    assert_eq!(payload_count, 0);

    let index_dir = root.join("memory/raw/index");
    let metadata_count = std::fs::read_dir(&index_dir).unwrap().count();
    assert_eq!(metadata_count, 0);

    // Policy denial job report exists.
    let denial_log = root.join("memory/jobs/policy_denial.jsonl");
    let text = std::fs::read_to_string(&denial_log).unwrap();
    assert!(text.contains("\"status\":\"blocked\""));
}

#[test]
fn graphify_check_succeeds_when_unavailable_and_records_status() {
    let tmp = tempfile::TempDir::new().unwrap();
    let root = tmp.path().join("runtime");
    let root_str = root.display().to_string();

    // Force GRAPHIFY_CMD to a guaranteed-missing binary so the test is hermetic.
    let prev = std::env::var(dore::graphify::availability::ENV_GRAPHIFY_CMD).ok();
    std::env::set_var(
        dore::graphify::availability::ENV_GRAPHIFY_CMD,
        "definitely-not-installed-graphify-xyz",
    );

    let (stdout, _, result) =
        run_cli(&["graphify", "check", "--runtime-root", &root_str]);

    if let Some(value) = prev {
        std::env::set_var(dore::graphify::availability::ENV_GRAPHIFY_CMD, value);
    } else {
        std::env::remove_var(dore::graphify::availability::ENV_GRAPHIFY_CMD);
    }

    result.unwrap();
    assert!(
        stdout.contains("unavailable"),
        "GRAPHIFY_CMD override must be authoritative; stdout was: {stdout}"
    );

    // A status report must have been written.
    let status_dir = root.join("memory/graph/status");
    let entries: Vec<_> = std::fs::read_dir(&status_dir).unwrap().collect();
    assert_eq!(entries.len(), 1, "expected exactly one status snapshot");

    // graphify_check.jsonl exists and has one record.
    let log = std::fs::read_to_string(root.join("memory/jobs/graphify_check.jsonl")).unwrap();
    assert_eq!(log.lines().count(), 1);
    assert!(
        log.contains("\"status\":\"unavailable\""),
        "graphify_check log should record unavailable status: {log}"
    );
}

fn walkdir(root: &Path) -> impl Iterator<Item = std::path::PathBuf> {
    let mut stack = vec![root.to_path_buf()];
    let mut files = Vec::new();
    while let Some(path) = stack.pop() {
        if let Ok(read) = std::fs::read_dir(&path) {
            for entry in read.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    stack.push(p);
                } else {
                    files.push(p);
                }
            }
        }
    }
    files.into_iter()
}
