use std::path::PathBuf;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DoreError {
    #[error("I/O error at {path}: {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("invalid runtime root {path}: {reason}")]
    InvalidRuntimeRoot { path: PathBuf, reason: String },

    #[error("policy denied (decision {decision_id}): {reason}")]
    PolicyDenied {
        decision_id: String,
        reason: String,
    },

    #[error("approval required (decision {decision_id}) for action {action}")]
    ApprovalRequired {
        decision_id: String,
        action: String,
    },

    #[error("unsupported source kind: {source_kind}")]
    UnsupportedSourceKind { source_kind: String },

    #[error("invalid input for field {field}: {reason}")]
    InvalidInput { field: String, reason: String },

    #[error("append-only violation at {path}")]
    AppendOnlyViolation { path: PathBuf },

    #[error("serialization error ({format}): {message}")]
    Serialization { format: String, message: String },

    #[error("graphify probe failed for {command}: {reason}")]
    GraphifyProbeFailed { command: String, reason: String },
}

impl DoreError {
    /// Return a stable short code suitable for exit codes and logs.
    pub fn code(&self) -> &'static str {
        match self {
            DoreError::Io { .. } => "io",
            DoreError::InvalidRuntimeRoot { .. } => "invalid_runtime_root",
            DoreError::PolicyDenied { .. } => "policy_denied",
            DoreError::ApprovalRequired { .. } => "approval_required",
            DoreError::UnsupportedSourceKind { .. } => "unsupported_source_kind",
            DoreError::InvalidInput { .. } => "invalid_input",
            DoreError::AppendOnlyViolation { .. } => "append_only_violation",
            DoreError::Serialization { .. } => "serialization",
            DoreError::GraphifyProbeFailed { .. } => "graphify_probe_failed",
        }
    }
}

pub type DoreResult<T> = std::result::Result<T, DoreError>;
