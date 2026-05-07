use std::fs;
use std::path::PathBuf;

use crate::core::error::{DoreError, DoreResult};
use crate::policy::defaults::{embedded_defaults_toml, PolicyDefaults};
use crate::runtime::layout::RuntimeLayout;
use crate::storage::artifact_store::atomic_write;

#[derive(Debug, Clone)]
pub struct RuntimeInitResult {
    pub runtime_root: PathBuf,
    pub created_paths: Vec<PathBuf>,
    pub already_present: Vec<PathBuf>,
    pub policy_defaults_path: PathBuf,
    pub policy_snapshot_path: PathBuf,
    pub policy_defaults_written: bool,
    pub policy_snapshot_written: bool,
}

pub trait RuntimeInitializerPort: Send + Sync {
    fn init(&self, layout: &RuntimeLayout) -> DoreResult<RuntimeInitResult>;
}

#[derive(Debug, Default)]
pub struct RuntimeInitializer;

impl RuntimeInitializer {
    pub fn new() -> Self {
        Self
    }
}

impl RuntimeInitializerPort for RuntimeInitializer {
    fn init(&self, layout: &RuntimeLayout) -> DoreResult<RuntimeInitResult> {
        let mut created = Vec::new();
        let mut existing = Vec::new();
        for dir in layout.required_directories() {
            if dir.exists() {
                if !dir.is_dir() {
                    return Err(DoreError::InvalidRuntimeRoot {
                        path: dir,
                        reason: "expected directory but found a non-directory entry".into(),
                    });
                }
                existing.push(dir);
                continue;
            }
            fs::create_dir_all(&dir).map_err(|source| DoreError::Io {
                path: dir.clone(),
                source,
            })?;
            created.push(dir);
        }

        // Materialize the active policy as both a human-readable TOML config
        // (editable starting point) and a JSON snapshot (machine-readable
        // record of the defaults the runtime is enforcing). The TOML file is
        // never overwritten so user edits survive subsequent inits; the JSON
        // snapshot is rewritten so it always reflects the embedded defaults
        // shipped with the binary.
        let policy_defaults_path = layout.policy_defaults_toml_path();
        let policy_defaults_written = if policy_defaults_path.exists() {
            false
        } else {
            atomic_write(&policy_defaults_path, embedded_defaults_toml().as_bytes())?;
            true
        };

        let snapshot_path = layout.policy_snapshot_json_path();
        let defaults = PolicyDefaults::embedded()?;
        let snapshot_bytes =
            serde_json::to_vec_pretty(&defaults).map_err(|err| DoreError::Serialization {
                format: "json".into(),
                message: err.to_string(),
            })?;
        atomic_write(&snapshot_path, &snapshot_bytes)?;

        Ok(RuntimeInitResult {
            runtime_root: layout.runtime_root().to_path_buf(),
            created_paths: created,
            already_present: existing,
            policy_defaults_path,
            policy_snapshot_path: snapshot_path,
            policy_defaults_written,
            policy_snapshot_written: true,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn init_is_idempotent_and_creates_all_directories() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().join("runtime");
        let layout = RuntimeLayout::new(&root).unwrap();
        let init = RuntimeInitializer::new();

        let first = init.init(&layout).unwrap();
        assert!(first.runtime_root.ends_with("runtime"));
        assert!(layout.memory_root().exists());
        assert!(layout.wiki_dir().exists());
        assert!(layout.jobs_dir().exists());

        let second = init.init(&layout).unwrap();
        assert!(second.created_paths.is_empty());
        assert!(!second.already_present.is_empty());
    }

    #[test]
    fn init_writes_visible_policy_defaults_and_snapshot() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().join("runtime");
        let layout = RuntimeLayout::new(&root).unwrap();
        let init = RuntimeInitializer::new();

        let first = init.init(&layout).unwrap();
        assert!(first.policy_defaults_path.exists());
        assert!(first.policy_snapshot_path.exists());
        assert!(first.policy_defaults_written);
        assert!(first.policy_snapshot_written);

        let toml_text = std::fs::read_to_string(&first.policy_defaults_path).unwrap();
        assert!(toml_text.contains("local_only = true"));
        assert!(toml_text.contains("schema_version = \"policy_defaults.v1\""));

        let snapshot_text = std::fs::read_to_string(&first.policy_snapshot_path).unwrap();
        let snapshot_json: serde_json::Value = serde_json::from_str(&snapshot_text).unwrap();
        assert_eq!(snapshot_json["schema_version"], "policy_defaults.v1");
        assert_eq!(snapshot_json["local_only"], true);
        assert_eq!(snapshot_json["sync"]["cloud_sync_enabled"], false);
        assert_eq!(
            snapshot_json["approval"]["cloud_sync_requires_approval"],
            true
        );
    }

    #[test]
    fn init_preserves_user_edits_to_policy_defaults_toml() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().join("runtime");
        let layout = RuntimeLayout::new(&root).unwrap();
        let init = RuntimeInitializer::new();

        init.init(&layout).unwrap();
        let path = layout.policy_defaults_toml_path();
        std::fs::write(&path, "user_local_edit = true\n").unwrap();

        let second = init.init(&layout).unwrap();
        assert!(!second.policy_defaults_written);
        let preserved = std::fs::read_to_string(&path).unwrap();
        assert_eq!(preserved, "user_local_edit = true\n");
    }
}
