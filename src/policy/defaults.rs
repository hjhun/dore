use serde::{Deserialize, Serialize};

use crate::core::error::{DoreError, DoreResult};

const EMBEDDED_DEFAULTS_TOML: &str = include_str!("policy_defaults.toml");

pub fn embedded_defaults_toml() -> &'static str {
    EMBEDDED_DEFAULTS_TOML
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct RetentionDefaults {
    pub default_class: String,
    pub standard_days: u32,
    pub destructive_cleanup_enabled: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct RedactionDefaults {
    pub default_profile: String,
    pub store_raw_payload: bool,
    pub redact_secrets: bool,
    pub redact_access_tokens: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct SyncDefaults {
    pub default_mode: String,
    pub cloud_sync_enabled: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct ApprovalDefaults {
    pub export_requires_approval: bool,
    pub cloud_sync_requires_approval: bool,
    pub raw_sensitive_access_requires_approval: bool,
    pub deny_unapproved_unsafe_actions: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct PolicyDefaults {
    pub schema_version: String,
    pub local_only: bool,
    pub retention: RetentionDefaults,
    pub redaction: RedactionDefaults,
    pub sync: SyncDefaults,
    pub approval: ApprovalDefaults,
}

impl PolicyDefaults {
    pub fn embedded() -> DoreResult<Self> {
        Self::from_toml(EMBEDDED_DEFAULTS_TOML)
    }

    pub fn from_toml(input: &str) -> DoreResult<Self> {
        toml::from_str::<PolicyDefaults>(input).map_err(|err| DoreError::Serialization {
            format: "toml".into(),
            message: err.to_string(),
        })
    }

    pub fn schema_version() -> &'static str {
        "policy_defaults.v1"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_defaults_match_design_contract() {
        let defaults = PolicyDefaults::embedded().expect("embedded defaults parse");
        assert_eq!(defaults.schema_version, "policy_defaults.v1");
        assert!(defaults.local_only);
        assert!(!defaults.sync.cloud_sync_enabled);
        assert_eq!(defaults.sync.default_mode, "local_only");
        assert!(defaults.approval.cloud_sync_requires_approval);
        assert!(defaults.approval.export_requires_approval);
        assert!(defaults.approval.deny_unapproved_unsafe_actions);
        assert!(!defaults.retention.destructive_cleanup_enabled);
        assert_eq!(defaults.retention.default_class, "standard");
        assert!(defaults.redaction.redact_secrets);
        assert!(defaults.redaction.redact_access_tokens);
    }
}
