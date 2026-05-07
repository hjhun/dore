use std::fs;
use std::io::Write;
use std::path::Path;

use crate::core::error::{DoreError, DoreResult};

/// Write `bytes` to `target` atomically by writing to a sibling temp file
/// and renaming it into place. The parent directory must already exist.
pub fn atomic_write(target: &Path, bytes: &[u8]) -> DoreResult<()> {
    let parent = target.parent().ok_or_else(|| DoreError::InvalidInput {
        field: "target".into(),
        reason: format!("path {} has no parent directory", target.display()),
    })?;
    fs::create_dir_all(parent).map_err(|source| DoreError::Io {
        path: parent.to_path_buf(),
        source,
    })?;
    let file_name = target.file_name().ok_or_else(|| DoreError::InvalidInput {
        field: "target".into(),
        reason: format!("path {} has no file name", target.display()),
    })?;
    let mut tmp = parent.join(file_name);
    let mut tmp_name = tmp
        .file_name()
        .map(|s| s.to_os_string())
        .unwrap_or_default();
    tmp_name.push(".tmp");
    tmp.set_file_name(tmp_name);
    {
        let mut file = fs::File::create(&tmp).map_err(|source| DoreError::Io {
            path: tmp.clone(),
            source,
        })?;
        file.write_all(bytes).map_err(|source| DoreError::Io {
            path: tmp.clone(),
            source,
        })?;
        file.sync_all().map_err(|source| DoreError::Io {
            path: tmp.clone(),
            source,
        })?;
    }
    fs::rename(&tmp, target).map_err(|source| DoreError::Io {
        path: target.to_path_buf(),
        source,
    })?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn atomic_write_replaces_target_and_leaves_no_tmp() {
        let tmp = TempDir::new().unwrap();
        let target = tmp.path().join("nested/dir/output.md");
        atomic_write(&target, b"first").unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "first");
        atomic_write(&target, b"second").unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "second");
        let parent = target.parent().unwrap();
        let leftovers: Vec<_> = fs::read_dir(parent)
            .unwrap()
            .map(|e| e.unwrap().file_name())
            .filter(|name| name.to_string_lossy().ends_with(".tmp"))
            .collect();
        assert!(leftovers.is_empty(), "found stale tmp files: {leftovers:?}");
    }
}
