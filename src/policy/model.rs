use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PolicyAction {
    IngestRawEvidence,
    GenerateWiki,
    GraphifyCheck,
    Export,
    CloudSync,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncMode {
    LocalOnly,
    Cloud,
    Export,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PolicyRequest {
    pub action: PolicyAction,
    pub source_kind: Option<String>,
    pub data_category: Option<String>,
    pub sensitivity: Option<String>,
    pub sync_mode: SyncMode,
    pub approval_granted: bool,
}

impl PolicyRequest {
    pub fn ingest_note(sensitivity: &str) -> Self {
        Self {
            action: PolicyAction::IngestRawEvidence,
            source_kind: Some("note".into()),
            data_category: Some("manual_note".into()),
            sensitivity: Some(sensitivity.into()),
            sync_mode: SyncMode::LocalOnly,
            approval_granted: false,
        }
    }

    pub fn ingest_conversation_summary(sensitivity: &str) -> Self {
        Self {
            action: PolicyAction::IngestRawEvidence,
            source_kind: Some("conversation_summary".into()),
            data_category: Some("manual_conversation_summary".into()),
            sensitivity: Some(sensitivity.into()),
            sync_mode: SyncMode::LocalOnly,
            approval_granted: false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PolicyOutcome {
    Allow,
    RequiresApproval,
    Deny,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PolicyDecision {
    pub decision_id: String,
    pub outcome: PolicyOutcome,
    pub reason: String,
    pub local_only: bool,
    pub retention_class: String,
    pub redaction_profile: String,
    pub sync_mode: SyncMode,
    pub approval_required: bool,
}
