use std::process::Command;
use std::sync::Arc;

use serde::{Deserialize, Serialize};

use crate::core::error::{DoreError, DoreResult};

pub const ENV_GRAPHIFY_CMD: &str = "GRAPHIFY_CMD";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GraphifyStatus {
    Installed,
    Invokable,
    Unavailable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphifyStatusReport {
    pub schema_version: String,
    pub status: GraphifyStatus,
    pub detection_method: String,
    pub command: Option<String>,
    pub version: Option<String>,
    pub message: String,
}

impl GraphifyStatusReport {
    pub fn unavailable(message: impl Into<String>) -> Self {
        Self {
            schema_version: "graphify_status.v1".into(),
            status: GraphifyStatus::Unavailable,
            detection_method: "command".into(),
            command: None,
            version: None,
            message: message.into(),
        }
    }
}

pub trait CommandProbe: Send + Sync {
    /// Probe `command` and return `Ok(Some(stdout))` when invokable,
    /// `Ok(None)` when missing, or `Err` for unexpected probe failures.
    fn probe(&self, command: &str, args: &[&str]) -> DoreResult<Option<String>>;
}

#[derive(Default)]
pub struct SystemCommandProbe;

impl SystemCommandProbe {
    pub fn new() -> Self {
        Self
    }
}

impl CommandProbe for SystemCommandProbe {
    fn probe(&self, command: &str, args: &[&str]) -> DoreResult<Option<String>> {
        match Command::new(command).args(args).output() {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    Ok(Some(stdout))
                } else {
                    // Command exists but returned non-zero. Treat as invokable
                    // because that still proves the binary resolves.
                    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    Ok(Some(stdout))
                }
            }
            Err(err) => match err.kind() {
                // Treat any failure to launch the candidate as "not available".
                // Sandboxes may translate a missing binary into PermissionDenied
                // instead of NotFound, and either way the command did not run.
                std::io::ErrorKind::NotFound | std::io::ErrorKind::PermissionDenied => {
                    Ok(None)
                }
                _ => Err(DoreError::GraphifyProbeFailed {
                    command: command.into(),
                    reason: err.to_string(),
                }),
            },
        }
    }
}

pub struct GraphifyAvailabilityChecker {
    probe: Arc<dyn CommandProbe>,
    /// Override applied first (typically GRAPHIFY_CMD env var).
    primary_command: Option<String>,
    /// Fallback commands tried in order.
    fallback_commands: Vec<String>,
}

impl GraphifyAvailabilityChecker {
    /// Build a checker from the process environment. When `GRAPHIFY_CMD` is
    /// set, it is treated as an authoritative override: only that command is
    /// probed and the built-in fallbacks are skipped. When it is unset, the
    /// checker falls back to the documented default of `graphify`.
    pub fn new(probe: Arc<dyn CommandProbe>) -> Self {
        let env_override = std::env::var(ENV_GRAPHIFY_CMD)
            .ok()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        match env_override {
            Some(cmd) => Self {
                probe,
                primary_command: Some(cmd),
                fallback_commands: Vec::new(),
            },
            None => Self {
                probe,
                primary_command: None,
                fallback_commands: vec!["graphify".into()],
            },
        }
    }

    pub fn with_commands(
        probe: Arc<dyn CommandProbe>,
        primary: Option<String>,
        fallbacks: Vec<String>,
    ) -> Self {
        Self {
            probe,
            primary_command: primary,
            fallback_commands: fallbacks,
        }
    }

    pub fn check(&self) -> DoreResult<GraphifyStatusReport> {
        let candidates: Vec<String> = self
            .primary_command
            .iter()
            .chain(self.fallback_commands.iter())
            .cloned()
            .collect();
        for command in &candidates {
            let probe_result = self.probe.probe(command, &["--version"]);
            match probe_result {
                Ok(Some(stdout)) => {
                    let version = stdout.lines().next().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
                    let status = if version.is_some() {
                        GraphifyStatus::Installed
                    } else {
                        GraphifyStatus::Invokable
                    };
                    return Ok(GraphifyStatusReport {
                        schema_version: "graphify_status.v1".into(),
                        status,
                        detection_method: "command".into(),
                        command: Some(command.clone()),
                        version,
                        message: format!("Graphify command {command} is invokable."),
                    });
                }
                Ok(None) => continue,
                Err(err) => return Err(err),
            }
        }
        Ok(GraphifyStatusReport::unavailable(format!(
            "Graphify is not available; tried commands: {}.",
            candidates.join(", ")
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    struct StubProbe {
        responses: Mutex<Vec<DoreResult<Option<String>>>>,
        invocations: Mutex<Vec<String>>,
    }

    impl StubProbe {
        fn new(responses: Vec<DoreResult<Option<String>>>) -> Self {
            Self {
                responses: Mutex::new(responses),
                invocations: Mutex::new(Vec::new()),
            }
        }
    }

    impl CommandProbe for StubProbe {
        fn probe(&self, command: &str, _args: &[&str]) -> DoreResult<Option<String>> {
            self.invocations
                .lock()
                .unwrap()
                .push(command.to_string());
            let mut q = self.responses.lock().unwrap();
            if q.is_empty() {
                return Ok(None);
            }
            q.remove(0)
        }
    }

    #[test]
    fn reports_installed_when_command_returns_version_output() {
        let probe = Arc::new(StubProbe::new(vec![Ok(Some("graphify 1.2.3".into()))]));
        let checker = GraphifyAvailabilityChecker::with_commands(
            probe,
            Some("graphify".into()),
            vec![],
        );
        let report = checker.check().unwrap();
        assert_eq!(report.status, GraphifyStatus::Installed);
        assert_eq!(report.command.as_deref(), Some("graphify"));
        assert_eq!(report.version.as_deref(), Some("graphify 1.2.3"));
    }

    #[test]
    fn reports_invokable_when_command_runs_but_no_version() {
        let probe = Arc::new(StubProbe::new(vec![Ok(Some(String::new()))]));
        let checker = GraphifyAvailabilityChecker::with_commands(
            probe,
            Some("graphify".into()),
            vec![],
        );
        let report = checker.check().unwrap();
        assert_eq!(report.status, GraphifyStatus::Invokable);
    }

    #[test]
    fn reports_unavailable_when_no_candidate_resolves() {
        let probe = Arc::new(StubProbe::new(vec![Ok(None), Ok(None)]));
        let checker = GraphifyAvailabilityChecker::with_commands(
            probe,
            Some("graphify-x".into()),
            vec!["graphify".into()],
        );
        let report = checker.check().unwrap();
        assert_eq!(report.status, GraphifyStatus::Unavailable);
        assert!(report.command.is_none());
    }

    #[test]
    fn env_override_disables_default_fallback() {
        // Simulate env var pointing at a missing binary.
        let probe = Arc::new(StubProbe::new(vec![Ok(None)]));
        let checker = GraphifyAvailabilityChecker::with_commands(
            probe.clone(),
            Some("/definitely/not/graphify".into()),
            Vec::new(),
        );
        let report = checker.check().unwrap();
        assert_eq!(report.status, GraphifyStatus::Unavailable);
        let invocations = probe.invocations.lock().unwrap().clone();
        assert_eq!(invocations, vec!["/definitely/not/graphify".to_string()]);
    }
}
