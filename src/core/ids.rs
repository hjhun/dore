use chrono::{DateTime, FixedOffset};
use std::sync::Mutex;

/// Generates unique, sortable identifiers for evidence, jobs, and policy
/// decisions. The IDs embed an RFC3339-derived timestamp prefix so they sort
/// chronologically and remain readable in directory listings.
pub trait IdFactory: Send + Sync {
    fn evidence_id(&self, captured_at: DateTime<FixedOffset>) -> String;
    fn job_id(&self, started_at: DateTime<FixedOffset>, kind: &str) -> String;
    fn policy_decision_id(&self, decided_at: DateTime<FixedOffset>) -> String;
}

/// Sequential id factory. Within a single process run it assigns monotonically
/// increasing per-second sequence numbers per category so collisions inside the
/// same wall-clock second remain deterministic.
pub struct SequentialIdFactory {
    state: Mutex<SequentialIdState>,
}

#[derive(Default)]
struct SequentialIdState {
    evidence: u32,
    job: u32,
    decision: u32,
}

impl SequentialIdFactory {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(SequentialIdState::default()),
        }
    }
}

impl Default for SequentialIdFactory {
    fn default() -> Self {
        Self::new()
    }
}

impl IdFactory for SequentialIdFactory {
    fn evidence_id(&self, captured_at: DateTime<FixedOffset>) -> String {
        let mut state = self.state.lock().expect("id factory mutex poisoned");
        state.evidence = state.evidence.saturating_add(1);
        format!(
            "evi_{}_{:04}",
            captured_at.format("%Y%m%d_%H%M%S"),
            state.evidence
        )
    }

    fn job_id(&self, started_at: DateTime<FixedOffset>, kind: &str) -> String {
        let mut state = self.state.lock().expect("id factory mutex poisoned");
        state.job = state.job.saturating_add(1);
        format!(
            "job_{}_{}_{:04}",
            started_at.format("%Y%m%d_%H%M%S"),
            kind,
            state.job
        )
    }

    fn policy_decision_id(&self, decided_at: DateTime<FixedOffset>) -> String {
        let mut state = self.state.lock().expect("id factory mutex poisoned");
        state.decision = state.decision.saturating_add(1);
        format!(
            "pol_{}_{:04}",
            decided_at.format("%Y%m%d_%H%M%S"),
            state.decision
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::DateTime;

    fn ts(s: &str) -> DateTime<FixedOffset> {
        DateTime::parse_from_rfc3339(s).unwrap()
    }

    #[test]
    fn ids_are_prefixed_and_sequenced_per_kind() {
        let factory = SequentialIdFactory::new();
        let t = ts("2026-05-07T16:00:00+00:00");

        assert_eq!(factory.evidence_id(t), "evi_20260507_160000_0001");
        assert_eq!(factory.evidence_id(t), "evi_20260507_160000_0002");
        assert_eq!(factory.job_id(t, "ingest"), "job_20260507_160000_ingest_0001");
        assert_eq!(factory.policy_decision_id(t), "pol_20260507_160000_0001");
    }
}
