use chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Succeeded,
    Blocked,
    Failed,
    Available,
    Unavailable,
    Invokable,
    Installed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobReport {
    pub schema_version: String,
    pub job_id: String,
    pub job_kind: String,
    pub status: JobStatus,
    pub started_at: DateTime<FixedOffset>,
    pub finished_at: DateTime<FixedOffset>,
    pub inputs: Vec<String>,
    pub outputs: Vec<String>,
    pub policy_decisions: Vec<String>,
    pub error: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detail: Option<serde_json::Value>,
}

impl JobReport {
    pub fn new(
        job_id: impl Into<String>,
        job_kind: impl Into<String>,
        status: JobStatus,
        started_at: DateTime<FixedOffset>,
        finished_at: DateTime<FixedOffset>,
    ) -> Self {
        Self {
            schema_version: "job_report.v1".into(),
            job_id: job_id.into(),
            job_kind: job_kind.into(),
            status,
            started_at,
            finished_at,
            inputs: Vec::new(),
            outputs: Vec::new(),
            policy_decisions: Vec::new(),
            error: None,
            detail: None,
        }
    }

    pub fn with_inputs(mut self, inputs: Vec<String>) -> Self {
        self.inputs = inputs;
        self
    }

    pub fn with_outputs(mut self, outputs: Vec<String>) -> Self {
        self.outputs = outputs;
        self
    }

    pub fn with_policy_decisions(mut self, decisions: Vec<String>) -> Self {
        self.policy_decisions = decisions;
        self
    }

    pub fn with_error(mut self, error: impl Into<String>) -> Self {
        self.error = Some(error.into());
        self
    }

    pub fn with_detail(mut self, detail: serde_json::Value) -> Self {
        self.detail = Some(detail);
        self
    }
}
