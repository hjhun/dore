use chrono::{DateTime, FixedOffset};
use std::fs::{self, OpenOptions};
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::core::error::{DoreError, DoreResult};
use crate::runtime::layout::RuntimeLayout;

const MAX_JOB_ID_RETRIES: u32 = 1024;

/// Generates unique, sortable identifiers for evidence, jobs, and policy
/// decisions. The IDs embed an RFC3339-derived timestamp prefix so they sort
/// chronologically and remain readable in directory listings.
pub trait IdFactory: Send + Sync {
    fn evidence_id(&self, captured_at: DateTime<FixedOffset>) -> String;
    fn job_id(&self, started_at: DateTime<FixedOffset>, kind: &str) -> String;
    fn policy_decision_id(&self, decided_at: DateTime<FixedOffset>) -> String;
}

/// Allocates a job ID that is unique across concurrent CLI invocations.
///
/// Two distinct processes that compute the same `(started_at, kind)` would
/// otherwise mint the same `job_<ts>_<kind>_0001` because each invocation owns
/// its own in-memory counter. Allocators reserve the chosen suffix on disk so
/// two rapid runs can never agree on the same id.
pub trait JobIdAllocator: Send + Sync {
    fn allocate(&self, started_at: DateTime<FixedOffset>, kind: &str) -> DoreResult<String>;
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

/// Filesystem-backed job ID allocator.
///
/// Reserves each chosen `job_<timestamp>_<kind>_<NNNN>` by atomically creating
/// an empty marker file at `<runtime>/memory/jobs/_reserved/<job_id>`. If the
/// marker already exists the allocator increments the suffix and retries until
/// it wins the race. Marker files are tiny and persist as a durable record of
/// every issued id so future invocations skip past them.
pub struct FsJobIdAllocator {
    layout: RuntimeLayout,
}

impl FsJobIdAllocator {
    pub fn new(layout: RuntimeLayout) -> Self {
        Self { layout }
    }

    fn reserved_dir(&self) -> PathBuf {
        self.layout.jobs_reserved_dir()
    }

    fn ensure_reserved_dir(&self, dir: &Path) -> DoreResult<()> {
        fs::create_dir_all(dir).map_err(|source| DoreError::Io {
            path: dir.to_path_buf(),
            source,
        })
    }

    fn highest_existing_suffix(&self, dir: &Path, needle: &str) -> DoreResult<u32> {
        let mut max_suffix: u32 = 0;
        let read = fs::read_dir(dir).map_err(|source| DoreError::Io {
            path: dir.to_path_buf(),
            source,
        })?;
        for entry in read {
            let entry = entry.map_err(|source| DoreError::Io {
                path: dir.to_path_buf(),
                source,
            })?;
            let name = entry.file_name();
            let s = name.to_string_lossy();
            let Some(rest) = s.strip_prefix(needle) else {
                continue;
            };
            if let Ok(n) = rest.parse::<u32>() {
                if n > max_suffix {
                    max_suffix = n;
                }
            }
        }
        Ok(max_suffix)
    }
}

impl JobIdAllocator for FsJobIdAllocator {
    fn allocate(&self, started_at: DateTime<FixedOffset>, kind: &str) -> DoreResult<String> {
        let dir = self.reserved_dir();
        self.ensure_reserved_dir(&dir)?;

        let timestamp = started_at.format("%Y%m%d_%H%M%S").to_string();
        let needle = format!("job_{timestamp}_{kind}_");

        // Seed the candidate suffix from the highest reservation already on
        // disk so we do not waste retries on collisions for high counts.
        let mut suffix = self.highest_existing_suffix(&dir, &needle)?;
        let mut attempts: u32 = 0;
        loop {
            suffix = suffix.saturating_add(1);
            let candidate = format!("{needle}{suffix:04}");
            let marker = dir.join(&candidate);
            match OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&marker)
            {
                Ok(_file) => {
                    return Ok(candidate);
                }
                Err(err) if err.kind() == ErrorKind::AlreadyExists => {
                    attempts += 1;
                    if attempts > MAX_JOB_ID_RETRIES {
                        return Err(DoreError::AppendOnlyViolation { path: marker });
                    }
                    continue;
                }
                Err(source) => {
                    return Err(DoreError::Io {
                        path: marker,
                        source,
                    });
                }
            }
        }
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
        assert_eq!(
            factory.job_id(t, "ingest"),
            "job_20260507_160000_ingest_0001"
        );
        assert_eq!(factory.policy_decision_id(t), "pol_20260507_160000_0001");
    }

    #[test]
    fn fs_job_id_allocator_returns_distinct_ids_for_same_timestamp() {
        let tmp = tempfile::TempDir::new().unwrap();
        let layout = RuntimeLayout::new(tmp.path()).unwrap();
        let allocator = FsJobIdAllocator::new(layout.clone());
        let t = ts("2026-05-07T16:00:00+00:00");

        let a = allocator.allocate(t, "ingest").unwrap();
        let b = allocator.allocate(t, "ingest").unwrap();
        let c = allocator.allocate(t, "ingest").unwrap();

        assert_eq!(a, "job_20260507_160000_ingest_0001");
        assert_eq!(b, "job_20260507_160000_ingest_0002");
        assert_eq!(c, "job_20260507_160000_ingest_0003");

        // Marker files persist on disk so future processes pick a fresh suffix.
        let reserved = layout.jobs_reserved_dir();
        for id in [&a, &b, &c] {
            assert!(reserved.join(id).is_file(), "missing marker {id}");
        }
    }

    #[test]
    fn fs_job_id_allocator_skips_existing_reservations_from_prior_processes() {
        let tmp = tempfile::TempDir::new().unwrap();
        let layout = RuntimeLayout::new(tmp.path()).unwrap();
        let reserved = layout.jobs_reserved_dir();
        std::fs::create_dir_all(&reserved).unwrap();

        // Pre-seed two reservations as if an earlier process had run.
        std::fs::write(reserved.join("job_20260507_160000_ingest_0001"), b"").unwrap();
        std::fs::write(reserved.join("job_20260507_160000_ingest_0002"), b"").unwrap();

        let allocator = FsJobIdAllocator::new(layout);
        let t = ts("2026-05-07T16:00:00+00:00");
        let next = allocator.allocate(t, "ingest").unwrap();
        assert_eq!(next, "job_20260507_160000_ingest_0003");
    }

    #[test]
    fn fs_job_id_allocator_namespaces_kinds_independently() {
        let tmp = tempfile::TempDir::new().unwrap();
        let layout = RuntimeLayout::new(tmp.path()).unwrap();
        let allocator = FsJobIdAllocator::new(layout);
        let t = ts("2026-05-07T16:00:00+00:00");

        assert_eq!(
            allocator.allocate(t, "ingest").unwrap(),
            "job_20260507_160000_ingest_0001"
        );
        assert_eq!(
            allocator.allocate(t, "graphify_check").unwrap(),
            "job_20260507_160000_graphify_check_0001"
        );
        assert_eq!(
            allocator.allocate(t, "ingest").unwrap(),
            "job_20260507_160000_ingest_0002"
        );
    }
}
