use std::path::PathBuf;
use std::sync::Arc;

use crate::core::clock::Clock;
use crate::core::error::{DoreError, DoreResult};
use crate::core::ids::IdFactory;
use crate::ingest::normalizer::EvidenceNormalizer;
use crate::jobs::reporter::{JobReport, JobStatus};
use crate::policy::engine::PolicyEngine;
use crate::policy::model::{PolicyOutcome, PolicyRequest, SyncMode};
use crate::storage::job_log_repository::JobLogRepositoryPort;
use crate::storage::raw_evidence_repository::{RawEvidenceRepositoryPort, StoredEvidence};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IngestSourceKind {
    Note,
    ConversationSummary,
}

impl IngestSourceKind {
    pub fn parse(value: &str) -> DoreResult<Self> {
        match value {
            "note" => Ok(Self::Note),
            "conversation-summary" | "conversation_summary" => Ok(Self::ConversationSummary),
            other => Err(DoreError::UnsupportedSourceKind {
                source_kind: other.to_string(),
            }),
        }
    }

    pub fn canonical_source_kind(self) -> &'static str {
        match self {
            Self::Note => "note",
            Self::ConversationSummary => "conversation_summary",
        }
    }

    pub fn data_category(self) -> &'static str {
        match self {
            Self::Note => "manual_note",
            Self::ConversationSummary => "manual_conversation_summary",
        }
    }
}

#[derive(Debug, Clone)]
pub struct IngestRequest {
    pub kind: IngestSourceKind,
    pub title: String,
    pub payload: Vec<u8>,
    pub sync_mode: SyncMode,
    pub approval_granted: bool,
    pub sensitivity: String,
    pub source_label: String,
    pub provenance_note: Option<String>,
}

#[derive(Debug, Clone)]
pub struct IngestResult {
    pub stored: StoredEvidence,
    pub job_report_path: PathBuf,
    pub job_id: String,
    pub decision_id: String,
}

pub struct IngestionService {
    policy: Arc<PolicyEngine>,
    normalizer: EvidenceNormalizer,
    raw_repo: Arc<dyn RawEvidenceRepositoryPort>,
    job_log: Arc<dyn JobLogRepositoryPort>,
    clock: Arc<dyn Clock>,
    ids: Arc<dyn IdFactory>,
}

impl IngestionService {
    pub fn new(
        policy: Arc<PolicyEngine>,
        normalizer: EvidenceNormalizer,
        raw_repo: Arc<dyn RawEvidenceRepositoryPort>,
        job_log: Arc<dyn JobLogRepositoryPort>,
        clock: Arc<dyn Clock>,
        ids: Arc<dyn IdFactory>,
    ) -> Self {
        Self {
            policy,
            normalizer,
            raw_repo,
            job_log,
            clock,
            ids,
        }
    }

    pub fn ingest(&self, request: IngestRequest) -> DoreResult<IngestResult> {
        let started_at = self.clock.now();
        let job_id = self.ids.job_id(started_at, "ingest");

        let policy_request = PolicyRequest {
            action: crate::policy::model::PolicyAction::IngestRawEvidence,
            source_kind: Some(request.kind.canonical_source_kind().to_string()),
            data_category: Some(request.kind.data_category().to_string()),
            sensitivity: Some(request.sensitivity.clone()),
            sync_mode: request.sync_mode,
            approval_granted: request.approval_granted,
        };

        let decision_result = self.policy.evaluate(&policy_request);
        let decision = match decision_result {
            Ok(d) => d,
            Err(err) => {
                let finished_at = self.clock.now();
                let (decision_id, reason) = match &err {
                    DoreError::PolicyDenied { decision_id, reason } => {
                        (decision_id.clone(), reason.clone())
                    }
                    other => (String::from("unknown"), other.to_string()),
                };
                let blocked = JobReport::new(
                    &job_id,
                    "ingest",
                    JobStatus::Blocked,
                    started_at,
                    finished_at,
                )
                .with_inputs(vec![request.source_label.clone()])
                .with_policy_decisions(vec![decision_id.clone()])
                .with_error(reason);
                self.job_log.append("policy_denial", &blocked)?;
                return Err(err);
            }
        };

        if !matches!(decision.outcome, PolicyOutcome::Allow) {
            // Defensive: any non-allow outcome should already have errored.
            return Err(DoreError::PolicyDenied {
                decision_id: decision.decision_id,
                reason: format!("unexpected outcome {:?}", decision.outcome),
            });
        }

        let (payload, metadata) = self.normalizer.build(
            request.kind,
            &request.title,
            &request.sensitivity,
            request.payload,
            started_at,
            job_id.clone(),
            decision.clone(),
            request.provenance_note,
        )?;

        let stored = self.raw_repo.append(payload, metadata)?;

        let finished_at = self.clock.now();
        let report = JobReport::new(
            &job_id,
            "ingest",
            JobStatus::Succeeded,
            started_at,
            finished_at,
        )
        .with_inputs(vec![request.source_label])
        .with_outputs(vec![
            stored.metadata.evidence_id.clone(),
            stored.metadata.payload.path.clone(),
        ])
        .with_policy_decisions(vec![decision.decision_id.clone()]);
        let report_path = self.job_log.append("ingest", &report)?;

        Ok(IngestResult {
            stored,
            job_report_path: report_path,
            job_id,
            decision_id: decision.decision_id,
        })
    }
}
