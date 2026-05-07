use std::sync::Arc;

use chrono::{DateTime, FixedOffset};

use crate::core::checksum::sha256_hex;
use crate::core::clock::Clock;
use crate::core::error::{DoreError, DoreResult};
use crate::core::ids::IdFactory;
use crate::ingest::service::IngestSourceKind;
use crate::policy::model::PolicyDecision;
use crate::storage::raw_evidence_repository::{
    Provenance, RawEvidenceMetadata, RawPayload, RawPayloadDescriptor,
};

pub struct EvidenceNormalizer {
    clock: Arc<dyn Clock>,
    ids: Arc<dyn IdFactory>,
}

impl EvidenceNormalizer {
    pub fn new(clock: Arc<dyn Clock>, ids: Arc<dyn IdFactory>) -> Self {
        Self { clock, ids }
    }

    pub fn build(
        &self,
        kind: IngestSourceKind,
        title: &str,
        sensitivity: &str,
        payload_bytes: Vec<u8>,
        captured_at: DateTime<FixedOffset>,
        job_id: String,
        decision: PolicyDecision,
        provenance_note: Option<String>,
    ) -> DoreResult<(RawPayload, RawEvidenceMetadata)> {
        if title.trim().is_empty() {
            return Err(DoreError::InvalidInput {
                field: "title".into(),
                reason: "title must be non-empty".into(),
            });
        }
        if payload_bytes.is_empty() {
            return Err(DoreError::InvalidInput {
                field: "payload".into(),
                reason: "payload must be non-empty".into(),
            });
        }

        let evidence_id = self.ids.evidence_id(captured_at);
        let created_at = self.clock.now();
        let sha = sha256_hex(&payload_bytes);

        let metadata = RawEvidenceMetadata {
            schema_version: "raw_evidence.v1".into(),
            evidence_id,
            job_id,
            source_kind: kind.canonical_source_kind().to_string(),
            data_category: kind.data_category().to_string(),
            sensitivity: sensitivity.to_string(),
            title: title.to_string(),
            created_at,
            captured_at,
            payload: RawPayloadDescriptor {
                path: String::new(),
                sha256: sha,
                content_type: "text/markdown".into(),
                bytes: payload_bytes.len() as u64,
            },
            provenance: Provenance {
                collector: "manual_cli".into(),
                source_uri: None,
                conversation_id: None,
                note: provenance_note,
            },
            policy: decision,
            generated_outputs: vec![],
        };

        let payload = RawPayload {
            bytes: payload_bytes,
            content_type: "text/markdown".into(),
        };

        Ok((payload, metadata))
    }
}
