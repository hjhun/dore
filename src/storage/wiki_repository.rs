use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

use crate::core::error::{DoreError, DoreResult};
use crate::runtime::layout::RuntimeLayout;
use crate::storage::artifact_store::atomic_write;

pub trait WikiRepositoryPort: Send + Sync {
    fn write_index(&self, body: &str) -> DoreResult<PathBuf>;
    fn append_log(&self, entry: &str) -> DoreResult<PathBuf>;
    fn read_index(&self) -> DoreResult<Option<String>>;
    fn read_log(&self) -> DoreResult<Option<String>>;
}

pub struct WikiRepository {
    layout: RuntimeLayout,
}

impl WikiRepository {
    pub fn new(layout: RuntimeLayout) -> Self {
        Self { layout }
    }
}

impl WikiRepositoryPort for WikiRepository {
    fn write_index(&self, body: &str) -> DoreResult<PathBuf> {
        std::fs::create_dir_all(self.layout.wiki_dir()).map_err(|source| DoreError::Io {
            path: self.layout.wiki_dir(),
            source,
        })?;
        let target = self.layout.wiki_index_path();
        atomic_write(&target, body.as_bytes())?;
        Ok(target)
    }

    fn append_log(&self, entry: &str) -> DoreResult<PathBuf> {
        std::fs::create_dir_all(self.layout.wiki_dir()).map_err(|source| DoreError::Io {
            path: self.layout.wiki_dir(),
            source,
        })?;
        let target = self.layout.wiki_log_path();
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&target)
            .map_err(|source| DoreError::Io {
                path: target.clone(),
                source,
            })?;
        file.write_all(entry.as_bytes()).map_err(|source| DoreError::Io {
            path: target.clone(),
            source,
        })?;
        if !entry.ends_with('\n') {
            file.write_all(b"\n").map_err(|source| DoreError::Io {
                path: target.clone(),
                source,
            })?;
        }
        file.sync_all().map_err(|source| DoreError::Io {
            path: target.clone(),
            source,
        })?;
        Ok(target)
    }

    fn read_index(&self) -> DoreResult<Option<String>> {
        read_optional(&self.layout.wiki_index_path())
    }

    fn read_log(&self) -> DoreResult<Option<String>> {
        read_optional(&self.layout.wiki_log_path())
    }
}

fn read_optional(path: &std::path::Path) -> DoreResult<Option<String>> {
    if !path.exists() {
        return Ok(None);
    }
    let bytes = std::fs::read(path).map_err(|source| DoreError::Io {
        path: path.to_path_buf(),
        source,
    })?;
    Ok(Some(
        String::from_utf8(bytes).map_err(|err| DoreError::Serialization {
            format: "utf-8".into(),
            message: err.to_string(),
        })?,
    ))
}
