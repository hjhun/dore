use std::sync::Arc;

use crate::core::clock::Clock;
use crate::core::error::{DoreError, DoreResult};
use crate::core::ids::IdFactory;
use crate::policy::defaults::PolicyDefaults;
use crate::policy::model::{
    PolicyAction, PolicyDecision, PolicyOutcome, PolicyRequest, SyncMode,
};

pub struct PolicyEngine {
    defaults: PolicyDefaults,
    clock: Arc<dyn Clock>,
    ids: Arc<dyn IdFactory>,
}

impl PolicyEngine {
    pub fn new(defaults: PolicyDefaults, clock: Arc<dyn Clock>, ids: Arc<dyn IdFactory>) -> Self {
        Self { defaults, clock, ids }
    }

    pub fn defaults(&self) -> &PolicyDefaults {
        &self.defaults
    }

    pub fn evaluate(&self, request: &PolicyRequest) -> DoreResult<PolicyDecision> {
        let now = self.clock.now();
        let decision_id = self.ids.policy_decision_id(now);

        // Cloud sync is denied unless explicitly enabled in defaults *and*
        // the caller passes approval. The first slice never enables it.
        if matches!(request.sync_mode, SyncMode::Cloud)
            || matches!(request.action, PolicyAction::CloudSync)
        {
            if !self.defaults.sync.cloud_sync_enabled
                || (self.defaults.approval.cloud_sync_requires_approval
                    && !request.approval_granted)
            {
                let decision = PolicyDecision {
                    decision_id: decision_id.clone(),
                    outcome: PolicyOutcome::Deny,
                    reason: "cloud sync is disabled by local-only defaults".into(),
                    local_only: self.defaults.local_only,
                    retention_class: self.defaults.retention.default_class.clone(),
                    redaction_profile: self.defaults.redaction.default_profile.clone(),
                    sync_mode: request.sync_mode,
                    approval_required: true,
                };
                return Err(DoreError::PolicyDenied {
                    decision_id: decision.decision_id,
                    reason: decision.reason,
                });
            }
        }

        if matches!(request.sync_mode, SyncMode::Export)
            || matches!(request.action, PolicyAction::Export)
        {
            if self.defaults.approval.export_requires_approval && !request.approval_granted {
                let decision = PolicyDecision {
                    decision_id: decision_id.clone(),
                    outcome: PolicyOutcome::Deny,
                    reason: "export requires explicit approval".into(),
                    local_only: self.defaults.local_only,
                    retention_class: self.defaults.retention.default_class.clone(),
                    redaction_profile: self.defaults.redaction.default_profile.clone(),
                    sync_mode: request.sync_mode,
                    approval_required: true,
                };
                return Err(DoreError::PolicyDenied {
                    decision_id: decision.decision_id,
                    reason: decision.reason,
                });
            }
        }

        // Sensitive raw access without approval is denied.
        if matches!(request.action, PolicyAction::IngestRawEvidence) {
            let sensitivity = request.sensitivity.as_deref().unwrap_or("sensitive");
            if sensitivity == "secret"
                && self.defaults.approval.raw_sensitive_access_requires_approval
                && !request.approval_granted
            {
                let decision = PolicyDecision {
                    decision_id: decision_id.clone(),
                    outcome: PolicyOutcome::Deny,
                    reason: "secret raw evidence requires explicit approval".into(),
                    local_only: self.defaults.local_only,
                    retention_class: self.defaults.retention.default_class.clone(),
                    redaction_profile: self.defaults.redaction.default_profile.clone(),
                    sync_mode: request.sync_mode,
                    approval_required: true,
                };
                return Err(DoreError::PolicyDenied {
                    decision_id: decision.decision_id,
                    reason: decision.reason,
                });
            }
        }

        Ok(PolicyDecision {
            decision_id,
            outcome: PolicyOutcome::Allow,
            reason: "local-only operation permitted by safe defaults".into(),
            local_only: self.defaults.local_only,
            retention_class: self.defaults.retention.default_class.clone(),
            redaction_profile: self.defaults.redaction.default_profile.clone(),
            sync_mode: request.sync_mode,
            approval_required: false,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::clock::FixedClock;
    use crate::core::ids::SequentialIdFactory;

    fn engine() -> PolicyEngine {
        let defaults = PolicyDefaults::embedded().unwrap();
        let clock = Arc::new(FixedClock::from_rfc3339_list(&[
            "2026-05-07T16:00:00+00:00",
            "2026-05-07T16:00:01+00:00",
            "2026-05-07T16:00:02+00:00",
        ]));
        let ids = Arc::new(SequentialIdFactory::new());
        PolicyEngine::new(defaults, clock, ids)
    }

    #[test]
    fn allows_local_only_note_ingestion() {
        let request = PolicyRequest::ingest_note("sensitive");
        let decision = engine().evaluate(&request).unwrap();
        assert_eq!(decision.outcome, PolicyOutcome::Allow);
        assert!(decision.local_only);
        assert_eq!(decision.sync_mode, SyncMode::LocalOnly);
        assert!(!decision.approval_required);
    }

    #[test]
    fn denies_cloud_sync_without_approval() {
        let mut request = PolicyRequest::ingest_note("sensitive");
        request.sync_mode = SyncMode::Cloud;
        let result = engine().evaluate(&request);
        let err = result.unwrap_err();
        match err {
            DoreError::PolicyDenied { reason, .. } => assert!(reason.contains("cloud sync")),
            other => panic!("expected PolicyDenied, got {other:?}"),
        }
    }

    #[test]
    fn denies_export_without_approval() {
        let mut request = PolicyRequest::ingest_note("sensitive");
        request.sync_mode = SyncMode::Export;
        let err = engine().evaluate(&request).unwrap_err();
        match err {
            DoreError::PolicyDenied { reason, .. } => assert!(reason.contains("export")),
            other => panic!("expected PolicyDenied, got {other:?}"),
        }
    }

    #[test]
    fn allows_cloud_sync_only_when_explicit_approval_and_enabled() {
        // Manually craft defaults that enable cloud sync to confirm gating logic.
        let toml = r#"schema_version = "policy_defaults.v1"
local_only = false

[retention]
default_class = "standard"
standard_days = 365
destructive_cleanup_enabled = false

[redaction]
default_profile = "default"
store_raw_payload = true
redact_secrets = true
redact_access_tokens = true

[sync]
default_mode = "local_only"
cloud_sync_enabled = true

[approval]
export_requires_approval = true
cloud_sync_requires_approval = true
raw_sensitive_access_requires_approval = true
deny_unapproved_unsafe_actions = true
"#;
        let defaults = PolicyDefaults::from_toml(toml).unwrap();
        let clock = Arc::new(FixedClock::from_rfc3339_list(&[
            "2026-05-07T16:00:00+00:00",
        ]));
        let ids = Arc::new(SequentialIdFactory::new());
        let engine = PolicyEngine::new(defaults, clock, ids);

        let mut request = PolicyRequest::ingest_note("sensitive");
        request.sync_mode = SyncMode::Cloud;
        request.approval_granted = true;
        let decision = engine.evaluate(&request).unwrap();
        assert_eq!(decision.outcome, PolicyOutcome::Allow);
    }
}
