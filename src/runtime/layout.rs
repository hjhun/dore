use std::path::{Path, PathBuf};

use crate::core::error::{DoreError, DoreResult};

pub const DEFAULT_RUNTIME_ROOT: &str = ".dore-local";
pub const RUNTIME_ROOT_ENV: &str = "DORE_RUNTIME_ROOT";

/// Memory subdirectories that must exist after `dore init` runs.
pub const MEMORY_SUBDIRS: &[&str] = &[
    "memory",
    "memory/raw",
    "memory/raw/notes",
    "memory/raw/conversations",
    "memory/wiki",
    "memory/digest",
    "memory/graph",
    "memory/graph/status",
    "memory/jobs",
    "memory/sync",
    "memory/policy",
    "memory/secrets",
    "memory/transcripts",
    "memory/recordings",
    "memory/tmp",
];

/// Resolve the runtime root using the documented precedence:
/// 1. explicit CLI argument (`Some(path)`)
/// 2. `DORE_RUNTIME_ROOT` environment variable
/// 3. the repo-local default `.dore-local`
pub fn resolve_runtime_root(cli_argument: Option<&Path>) -> PathBuf {
    if let Some(path) = cli_argument {
        return path.to_path_buf();
    }
    if let Ok(env_value) = std::env::var(RUNTIME_ROOT_ENV) {
        let trimmed = env_value.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }
    PathBuf::from(DEFAULT_RUNTIME_ROOT)
}

/// Value object describing the canonical paths under the runtime root. Every
/// path returned by [`RuntimeLayout`] is rooted under [`RuntimeLayout::runtime_root`].
#[derive(Debug, Clone)]
pub struct RuntimeLayout {
    runtime_root: PathBuf,
}

impl RuntimeLayout {
    pub fn new(runtime_root: impl Into<PathBuf>) -> DoreResult<Self> {
        let runtime_root: PathBuf = runtime_root.into();
        if runtime_root.as_os_str().is_empty() {
            return Err(DoreError::InvalidRuntimeRoot {
                path: runtime_root,
                reason: "runtime root path must not be empty".into(),
            });
        }
        Ok(Self { runtime_root })
    }

    pub fn runtime_root(&self) -> &Path {
        &self.runtime_root
    }

    pub fn memory_root(&self) -> PathBuf {
        self.runtime_root.join("memory")
    }

    pub fn raw_notes_dir(&self) -> PathBuf {
        self.memory_root().join("raw/notes")
    }

    pub fn raw_conversations_dir(&self) -> PathBuf {
        self.memory_root().join("raw/conversations")
    }

    pub fn wiki_dir(&self) -> PathBuf {
        self.memory_root().join("wiki")
    }

    pub fn wiki_index_path(&self) -> PathBuf {
        self.wiki_dir().join("index.md")
    }

    pub fn wiki_log_path(&self) -> PathBuf {
        self.wiki_dir().join("log.md")
    }

    pub fn jobs_dir(&self) -> PathBuf {
        self.memory_root().join("jobs")
    }

    pub fn job_log_path(&self, kind: &str) -> PathBuf {
        self.jobs_dir().join(format!("{kind}.jsonl"))
    }

    pub fn graph_status_dir(&self) -> PathBuf {
        self.memory_root().join("graph/status")
    }

    pub fn policy_runtime_dir(&self) -> PathBuf {
        self.memory_root().join("policy")
    }

    pub fn policy_defaults_toml_path(&self) -> PathBuf {
        self.policy_runtime_dir().join("defaults.toml")
    }

    pub fn policy_snapshot_json_path(&self) -> PathBuf {
        self.policy_runtime_dir().join("snapshot.json")
    }

    pub fn tmp_dir(&self) -> PathBuf {
        self.memory_root().join("tmp")
    }

    pub fn evidence_metadata_path(&self, evidence_id: &str) -> PathBuf {
        self.memory_root()
            .join("raw/index")
            .join(format!("{evidence_id}.json"))
    }

    /// All directories that should be created idempotently by initialization.
    pub fn required_directories(&self) -> Vec<PathBuf> {
        let mut dirs: Vec<PathBuf> = MEMORY_SUBDIRS
            .iter()
            .map(|sub| self.runtime_root.join(sub))
            .collect();
        dirs.push(self.runtime_root.join("memory/raw/index"));
        dirs
    }

    /// Reject paths that escape the runtime root.
    pub fn assert_within_root(&self, candidate: &Path) -> DoreResult<()> {
        let root = self.runtime_root.as_path();
        if candidate.starts_with(root) {
            Ok(())
        } else {
            Err(DoreError::InvalidRuntimeRoot {
                path: candidate.to_path_buf(),
                reason: format!(
                    "path must be under runtime root {}",
                    root.display()
                ),
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_runtime_root_prefers_cli_argument() {
        std::env::set_var(RUNTIME_ROOT_ENV, "/should/not/be/used");
        let resolved = resolve_runtime_root(Some(Path::new("/explicit/cli")));
        assert_eq!(resolved, PathBuf::from("/explicit/cli"));
        std::env::remove_var(RUNTIME_ROOT_ENV);
    }

    #[test]
    fn resolve_runtime_root_falls_back_to_default_when_unset() {
        std::env::remove_var(RUNTIME_ROOT_ENV);
        let resolved = resolve_runtime_root(None);
        assert_eq!(resolved, PathBuf::from(DEFAULT_RUNTIME_ROOT));
    }

    #[test]
    fn rejects_paths_outside_runtime_root() {
        let layout = RuntimeLayout::new("/runtime/root").unwrap();
        assert!(layout.assert_within_root(Path::new("/runtime/root/memory/raw/notes/x.md")).is_ok());
        assert!(layout.assert_within_root(Path::new("/somewhere/else")).is_err());
    }

    #[test]
    fn required_directories_include_memory_substructure() {
        let layout = RuntimeLayout::new("/runtime/root").unwrap();
        let dirs = layout.required_directories();
        assert!(dirs.contains(&PathBuf::from("/runtime/root/memory/wiki")));
        assert!(dirs.contains(&PathBuf::from("/runtime/root/memory/raw/notes")));
        assert!(dirs.contains(&PathBuf::from("/runtime/root/memory/jobs")));
        assert!(dirs.contains(&PathBuf::from("/runtime/root/memory/graph/status")));
    }
}
