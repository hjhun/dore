use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

use crate::core::error::{DoreError, DoreResult};
use crate::jobs::reporter::JobReport;
use crate::runtime::layout::RuntimeLayout;

pub trait JobLogRepositoryPort: Send + Sync {
    fn append(&self, kind: &str, report: &JobReport) -> DoreResult<PathBuf>;
}

pub struct JobLogRepository {
    layout: RuntimeLayout,
}

impl JobLogRepository {
    pub fn new(layout: RuntimeLayout) -> Self {
        Self { layout }
    }
}

impl JobLogRepositoryPort for JobLogRepository {
    fn append(&self, kind: &str, report: &JobReport) -> DoreResult<PathBuf> {
        let dir = self.layout.jobs_dir();
        std::fs::create_dir_all(&dir).map_err(|source| DoreError::Io {
            path: dir.clone(),
            source,
        })?;
        let path = self.layout.job_log_path(kind);
        let line = serde_json::to_string(report).map_err(|err| DoreError::Serialization {
            format: "json".into(),
            message: err.to_string(),
        })?;
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .map_err(|source| DoreError::Io {
                path: path.clone(),
                source,
            })?;
        file.write_all(line.as_bytes()).map_err(|source| DoreError::Io {
            path: path.clone(),
            source,
        })?;
        file.write_all(b"\n").map_err(|source| DoreError::Io {
            path: path.clone(),
            source,
        })?;
        file.sync_all().map_err(|source| DoreError::Io {
            path: path.clone(),
            source,
        })?;
        Ok(path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::jobs::reporter::JobStatus;
    use crate::runtime::init::{RuntimeInitializer, RuntimeInitializerPort};
    use chrono::DateTime;
    use tempfile::TempDir;

    fn report(kind: &str, id: &str) -> JobReport {
        let t = DateTime::parse_from_rfc3339("2026-05-07T16:00:00+00:00").unwrap();
        JobReport::new(id, kind, JobStatus::Succeeded, t, t)
    }

    #[test]
    fn append_preserves_previous_entries() {
        let tmp = TempDir::new().unwrap();
        let layout = RuntimeLayout::new(tmp.path()).unwrap();
        RuntimeInitializer::new().init(&layout).unwrap();
        let repo = JobLogRepository::new(layout.clone());

        let path = repo.append("ingest", &report("ingest", "job_a")).unwrap();
        repo.append("ingest", &report("ingest", "job_b")).unwrap();
        repo.append("ingest", &report("ingest", "job_c")).unwrap();

        let contents = std::fs::read_to_string(&path).unwrap();
        let lines: Vec<&str> = contents.lines().collect();
        assert_eq!(lines.len(), 3);
        assert!(lines[0].contains("job_a"));
        assert!(lines[1].contains("job_b"));
        assert!(lines[2].contains("job_c"));
    }
}
