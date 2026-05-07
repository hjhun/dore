use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};

use crate::core::error::{DoreError, DoreResult};
use crate::policy::model::PolicyDecision;
use crate::runtime::layout::RuntimeLayout;

const MAX_EVIDENCE_ID_RETRIES: u32 = 256;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Provenance {
    pub collector: String,
    pub source_uri: Option<String>,
    pub conversation_id: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RawPayloadDescriptor {
    pub path: String,
    pub sha256: String,
    pub content_type: String,
    pub bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawEvidenceMetadata {
    pub schema_version: String,
    pub evidence_id: String,
    pub job_id: String,
    pub source_kind: String,
    pub data_category: String,
    pub sensitivity: String,
    pub title: String,
    pub created_at: DateTime<FixedOffset>,
    pub captured_at: DateTime<FixedOffset>,
    pub payload: RawPayloadDescriptor,
    pub provenance: Provenance,
    pub policy: PolicyDecision,
    #[serde(default)]
    pub generated_outputs: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct RawPayload {
    pub bytes: Vec<u8>,
    pub content_type: String,
}

#[derive(Debug, Clone)]
pub struct StoredEvidence {
    pub metadata: RawEvidenceMetadata,
    pub payload_path: PathBuf,
    pub metadata_path: PathBuf,
}

pub trait RawEvidenceRepositoryPort: Send + Sync {
    fn append(
        &self,
        payload: RawPayload,
        metadata: RawEvidenceMetadata,
    ) -> DoreResult<StoredEvidence>;
    fn list_metadata(&self) -> DoreResult<Vec<RawEvidenceMetadata>>;
    fn record_generated_outputs(
        &self,
        evidence_id: &str,
        outputs: &[String],
    ) -> DoreResult<RawEvidenceMetadata>;
}

pub struct RawEvidenceRepository {
    layout: RuntimeLayout,
}

impl RawEvidenceRepository {
    pub fn new(layout: RuntimeLayout) -> Self {
        Self { layout }
    }

    fn payload_dir_for(&self, source_kind: &str, captured_at: DateTime<FixedOffset>) -> PathBuf {
        let base = match source_kind {
            "note" => self.layout.raw_notes_dir(),
            "conversation_summary" => self.layout.raw_conversations_dir(),
            // Defensive fallback under notes/, callers should validate kinds first.
            _ => self.layout.raw_notes_dir(),
        };
        base.join(captured_at.format("%Y").to_string())
            .join(captured_at.format("%m").to_string())
    }

    fn metadata_dir(&self) -> PathBuf {
        self.layout.memory_root().join("raw/index")
    }

    fn ensure_dir(&self, dir: &std::path::Path) -> DoreResult<()> {
        fs::create_dir_all(dir).map_err(|source| DoreError::Io {
            path: dir.to_path_buf(),
            source,
        })
    }
}

impl RawEvidenceRepositoryPort for RawEvidenceRepository {
    fn append(
        &self,
        payload: RawPayload,
        mut metadata: RawEvidenceMetadata,
    ) -> DoreResult<StoredEvidence> {
        let payload_dir = self.payload_dir_for(&metadata.source_kind, metadata.captured_at);
        let metadata_dir = self.metadata_dir();
        self.ensure_dir(&payload_dir)?;
        self.ensure_dir(&metadata_dir)?;

        // Resolve a unique on-disk evidence_id by reserving the metadata file
        // first via create_new. Concurrent processes that propose the same id
        // see the next reservation race-bump until both sides succeed.
        let mut metadata_bytes: Vec<u8>;
        let metadata_path: PathBuf;
        let payload_path: PathBuf;
        let mut attempts: u32 = 0;
        loop {
            // Pick an id that is not already taken on disk.
            metadata.evidence_id =
                resolve_available_evidence_id(&metadata.evidence_id, &metadata_dir)?;
            let candidate_metadata_path =
                metadata_dir.join(format!("{}.json", metadata.evidence_id));
            let candidate_payload_path =
                payload_dir.join(format!("{}.md", metadata.evidence_id));

            // Reflect the resolved storage path before serializing.
            let stored_relative =
                relative_path_under_runtime(&self.layout, &candidate_payload_path)?;
            metadata.payload.path = stored_relative;
            metadata.payload.content_type = payload.content_type.clone();
            metadata.payload.bytes = payload.bytes.len() as u64;

            metadata_bytes = serde_json::to_vec_pretty(&metadata).map_err(|err| {
                DoreError::Serialization {
                    format: "json".into(),
                    message: err.to_string(),
                }
            })?;

            match write_new_file(&candidate_metadata_path, &metadata_bytes) {
                Ok(()) => {
                    metadata_path = candidate_metadata_path;
                    payload_path = candidate_payload_path;
                    break;
                }
                Err(DoreError::Io { source, .. })
                    if source.kind() == ErrorKind::AlreadyExists =>
                {
                    attempts += 1;
                    if attempts > MAX_EVIDENCE_ID_RETRIES {
                        return Err(DoreError::AppendOnlyViolation {
                            path: candidate_metadata_path,
                        });
                    }
                    continue;
                }
                Err(err) => return Err(err),
            }
        }

        // Metadata reservation succeeded; write the payload. If that fails the
        // metadata reservation is rolled back so the id can be reused.
        if let Err(err) = write_new_file(&payload_path, &payload.bytes) {
            let _ = fs::remove_file(&metadata_path);
            return Err(err);
        }

        Ok(StoredEvidence {
            metadata,
            payload_path,
            metadata_path,
        })
    }

    fn list_metadata(&self) -> DoreResult<Vec<RawEvidenceMetadata>> {
        let dir = self.metadata_dir();
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let mut entries: Vec<RawEvidenceMetadata> = Vec::new();
        let read = fs::read_dir(&dir).map_err(|source| DoreError::Io {
            path: dir.clone(),
            source,
        })?;
        for entry in read {
            let entry = entry.map_err(|source| DoreError::Io {
                path: dir.clone(),
                source,
            })?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            let bytes = fs::read(&path).map_err(|source| DoreError::Io {
                path: path.clone(),
                source,
            })?;
            let metadata: RawEvidenceMetadata = serde_json::from_slice(&bytes).map_err(|err| {
                DoreError::Serialization {
                    format: "json".into(),
                    message: format!("{}: {}", path.display(), err),
                }
            })?;
            entries.push(metadata);
        }
        entries.sort_by(|a, b| a.captured_at.cmp(&b.captured_at));
        Ok(entries)
    }

    fn record_generated_outputs(
        &self,
        evidence_id: &str,
        outputs: &[String],
    ) -> DoreResult<RawEvidenceMetadata> {
        let metadata_path = self
            .metadata_dir()
            .join(format!("{evidence_id}.json"));
        if !metadata_path.exists() {
            return Err(DoreError::InvalidInput {
                field: "evidence_id".into(),
                reason: format!(
                    "no evidence metadata at {} for id {}",
                    metadata_path.display(),
                    evidence_id
                ),
            });
        }
        let bytes = fs::read(&metadata_path).map_err(|source| DoreError::Io {
            path: metadata_path.clone(),
            source,
        })?;
        let mut metadata: RawEvidenceMetadata =
            serde_json::from_slice(&bytes).map_err(|err| DoreError::Serialization {
                format: "json".into(),
                message: format!("{}: {}", metadata_path.display(), err),
            })?;
        // Merge outputs while preserving prior history (additive, deduped, ordered).
        for output in outputs {
            if !metadata.generated_outputs.iter().any(|existing| existing == output) {
                metadata.generated_outputs.push(output.clone());
            }
        }
        let serialized =
            serde_json::to_vec_pretty(&metadata).map_err(|err| DoreError::Serialization {
                format: "json".into(),
                message: err.to_string(),
            })?;
        crate::storage::artifact_store::atomic_write(&metadata_path, &serialized)?;
        Ok(metadata)
    }
}

fn resolve_available_evidence_id(
    requested_id: &str,
    metadata_dir: &Path,
) -> DoreResult<String> {
    // If the requested id is already free, use it as-is.
    let candidate = metadata_dir.join(format!("{requested_id}.json"));
    if !candidate.exists() {
        return Ok(requested_id.to_string());
    }

    // Otherwise pick the next suffix above the highest existing id sharing
    // the same `<prefix>_` (e.g. evi_YYYYMMDD_HHMMSS_).
    let (prefix, _) = match requested_id.rsplit_once('_') {
        Some(parts) => parts,
        None => {
            return Ok(format!("{requested_id}_0001"));
        }
    };
    let needle = format!("{prefix}_");

    let mut max_suffix: u32 = 0;
    let read = fs::read_dir(metadata_dir).map_err(|source| DoreError::Io {
        path: metadata_dir.to_path_buf(),
        source,
    })?;
    for entry in read {
        let entry = entry.map_err(|source| DoreError::Io {
            path: metadata_dir.to_path_buf(),
            source,
        })?;
        let name = entry.file_name();
        let s = name.to_string_lossy();
        let Some(stem) = s.strip_suffix(".json") else {
            continue;
        };
        let Some(rest) = stem.strip_prefix(&needle) else {
            continue;
        };
        if let Ok(n) = rest.parse::<u32>() {
            if n > max_suffix {
                max_suffix = n;
            }
        }
    }
    Ok(format!("{prefix}_{:04}", max_suffix + 1))
}

fn relative_path_under_runtime(layout: &RuntimeLayout, path: &std::path::Path) -> DoreResult<String> {
    let root = layout.runtime_root();
    let stripped = path
        .strip_prefix(root)
        .map_err(|_| DoreError::InvalidRuntimeRoot {
            path: path.to_path_buf(),
            reason: format!(
                "path is not within runtime root {}",
                root.display()
            ),
        })?;
    Ok(stripped.to_string_lossy().replace('\\', "/"))
}

fn write_new_file(path: &std::path::Path, bytes: &[u8]) -> DoreResult<()> {
    use std::fs::OpenOptions;
    use std::io::Write;
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(path)
        .map_err(|source| DoreError::Io {
            path: path.to_path_buf(),
            source,
        })?;
    file.write_all(bytes).map_err(|source| DoreError::Io {
        path: path.to_path_buf(),
        source,
    })?;
    file.sync_all().map_err(|source| DoreError::Io {
        path: path.to_path_buf(),
        source,
    })?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::policy::model::{PolicyOutcome, SyncMode};
    use crate::runtime::init::{RuntimeInitializer, RuntimeInitializerPort};
    use chrono::DateTime;
    use tempfile::TempDir;

    fn fixture_metadata(evidence_id: &str, source_kind: &str) -> RawEvidenceMetadata {
        let when = DateTime::parse_from_rfc3339("2026-05-07T16:00:00+00:00").unwrap();
        RawEvidenceMetadata {
            schema_version: "raw_evidence.v1".into(),
            evidence_id: evidence_id.into(),
            job_id: "job_x".into(),
            source_kind: source_kind.into(),
            data_category: "manual_note".into(),
            sensitivity: "sensitive".into(),
            title: "Smoke note".into(),
            created_at: when,
            captured_at: when,
            payload: RawPayloadDescriptor {
                path: String::new(),
                sha256: "deadbeef".into(),
                content_type: "text/markdown".into(),
                bytes: 0,
            },
            provenance: Provenance {
                collector: "manual_cli".into(),
                source_uri: None,
                conversation_id: None,
                note: None,
            },
            policy: PolicyDecision {
                decision_id: "pol_x".into(),
                outcome: PolicyOutcome::Allow,
                reason: "test".into(),
                local_only: true,
                retention_class: "standard".into(),
                redaction_profile: "default".into(),
                sync_mode: SyncMode::LocalOnly,
                approval_required: false,
            },
            generated_outputs: vec![],
        }
    }

    #[test]
    fn appending_with_duplicate_id_auto_disambiguates_to_a_fresh_suffix() {
        let tmp = TempDir::new().unwrap();
        let layout = RuntimeLayout::new(tmp.path()).unwrap();
        RuntimeInitializer::new().init(&layout).unwrap();
        let repo = RawEvidenceRepository::new(layout);

        let metadata = fixture_metadata("evi_20260507_160000_0001", "note");
        let payload = RawPayload {
            bytes: b"hello".to_vec(),
            content_type: "text/markdown".into(),
        };
        let first = repo.append(payload.clone(), metadata.clone()).unwrap();
        assert_eq!(first.metadata.evidence_id, "evi_20260507_160000_0001");

        let second = repo.append(payload, metadata).unwrap();
        assert_ne!(second.metadata.evidence_id, first.metadata.evidence_id);
        assert!(second.metadata.evidence_id.starts_with("evi_20260507_160000_"));
        assert!(second.payload_path.exists());
        assert!(second.metadata_path.exists());
    }

    #[test]
    fn record_generated_outputs_updates_metadata_idempotently() {
        let tmp = TempDir::new().unwrap();
        let layout = RuntimeLayout::new(tmp.path()).unwrap();
        RuntimeInitializer::new().init(&layout).unwrap();
        let repo = RawEvidenceRepository::new(layout);

        let metadata = fixture_metadata("evi_20260507_160000_0001", "note");
        let payload = RawPayload {
            bytes: b"hello".to_vec(),
            content_type: "text/markdown".into(),
        };
        let stored = repo.append(payload, metadata).unwrap();
        assert!(stored.metadata.generated_outputs.is_empty());

        let outputs = vec![
            "memory/wiki/index.md".to_string(),
            "memory/wiki/log.md".to_string(),
        ];
        let updated = repo
            .record_generated_outputs(&stored.metadata.evidence_id, &outputs)
            .unwrap();
        assert_eq!(updated.generated_outputs, outputs);

        // Re-applying the same outputs is a no-op (no duplicate entries).
        let again = repo
            .record_generated_outputs(&stored.metadata.evidence_id, &outputs)
            .unwrap();
        assert_eq!(again.generated_outputs, outputs);

        // Adding a new output appends without dropping prior entries.
        let extra = vec!["memory/wiki/log.md".into(), "memory/wiki/extra.md".into()];
        let merged = repo
            .record_generated_outputs(&stored.metadata.evidence_id, &extra)
            .unwrap();
        assert_eq!(
            merged.generated_outputs,
            vec![
                "memory/wiki/index.md".to_string(),
                "memory/wiki/log.md".to_string(),
                "memory/wiki/extra.md".to_string(),
            ]
        );
    }

    #[test]
    fn list_metadata_orders_by_captured_at() {
        let tmp = TempDir::new().unwrap();
        let layout = RuntimeLayout::new(tmp.path()).unwrap();
        RuntimeInitializer::new().init(&layout).unwrap();
        let repo = RawEvidenceRepository::new(layout);

        let mut a = fixture_metadata("evi_a", "note");
        a.captured_at = DateTime::parse_from_rfc3339("2026-05-07T16:00:00+00:00").unwrap();
        let mut b = fixture_metadata("evi_b", "note");
        b.captured_at = DateTime::parse_from_rfc3339("2026-05-07T16:05:00+00:00").unwrap();

        repo.append(
            RawPayload {
                bytes: b"two".to_vec(),
                content_type: "text/markdown".into(),
            },
            b.clone(),
        )
        .unwrap();
        repo.append(
            RawPayload {
                bytes: b"one".to_vec(),
                content_type: "text/markdown".into(),
            },
            a.clone(),
        )
        .unwrap();

        let listed = repo.list_metadata().unwrap();
        assert_eq!(listed.len(), 2);
        assert_eq!(listed[0].evidence_id, "evi_a");
        assert_eq!(listed[1].evidence_id, "evi_b");
    }
}
