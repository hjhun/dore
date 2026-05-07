use chrono::{DateTime, FixedOffset};

use crate::storage::raw_evidence_repository::RawEvidenceMetadata;

#[derive(Default)]
pub struct MarkdownRenderer;

impl MarkdownRenderer {
    pub fn new() -> Self {
        Self
    }

    pub fn render_index(
        &self,
        generated_at: DateTime<FixedOffset>,
        records: &[RawEvidenceMetadata],
    ) -> String {
        let mut out = String::new();
        out.push_str("# Dore LLM Wiki\n\n");
        out.push_str(&format!("Generated: {}\n\n", generated_at.to_rfc3339()));
        out.push_str("## Sources\n\n");
        if records.is_empty() {
            out.push_str("- No evidence has been ingested yet.\n");
        } else {
            for record in records {
                out.push_str(&format!(
                    "- [[{id}]] {title}\n",
                    id = record.evidence_id,
                    title = record.title,
                ));
                out.push_str(&format!("  - Kind: {}\n", record.source_kind));
                out.push_str(&format!(
                    "  - Captured: {}\n",
                    record.captured_at.to_rfc3339()
                ));
                out.push_str(&format!(
                    "  - Provenance: {}\n",
                    record.provenance.collector
                ));
                out.push_str(&format!("  - Payload SHA-256: {}\n", record.payload.sha256));
            }
        }
        out.push_str("\n## Recent Changes\n\n");
        out.push_str(&format!(
            "- {ts}: generated index from {count} evidence record{plural}.\n",
            ts = generated_at.to_rfc3339(),
            count = records.len(),
            plural = if records.len() == 1 { "" } else { "s" },
        ));
        out
    }

    pub fn render_log_entry(
        &self,
        generated_at: DateTime<FixedOffset>,
        job_id: &str,
        evidence_ids: &[String],
        outputs: &[String],
        provenance_collector: &str,
    ) -> String {
        let mut out = String::new();
        out.push_str(&format!(
            "## [{ts}] wiki_generate | {job}\n\n",
            ts = generated_at.to_rfc3339(),
            job = job_id,
        ));
        let evidence_display = if evidence_ids.is_empty() {
            "(none)".to_string()
        } else {
            evidence_ids.join(", ")
        };
        out.push_str(&format!("- Evidence: {evidence_display}\n"));
        out.push_str(&format!("- Outputs: {}\n", outputs.join(", ")));
        out.push_str(&format!("- Provenance: {provenance_collector}\n"));
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::policy::model::{PolicyDecision, PolicyOutcome, SyncMode};
    use crate::storage::raw_evidence_repository::{
        Provenance, RawEvidenceMetadata, RawPayloadDescriptor,
    };
    use chrono::DateTime;

    fn record() -> RawEvidenceMetadata {
        let when = DateTime::parse_from_rfc3339("2026-05-07T16:00:00+00:00").unwrap();
        RawEvidenceMetadata {
            schema_version: "raw_evidence.v1".into(),
            evidence_id: "evi_x".into(),
            job_id: "job_x".into(),
            source_kind: "note".into(),
            data_category: "manual_note".into(),
            sensitivity: "sensitive".into(),
            title: "Smoke note".into(),
            created_at: when,
            captured_at: when,
            payload: RawPayloadDescriptor {
                path: "memory/raw/notes/2026/05/evi_x.md".into(),
                sha256: "abc".into(),
                content_type: "text/markdown".into(),
                bytes: 5,
            },
            provenance: Provenance {
                collector: "manual_cli".into(),
                source_uri: None,
                conversation_id: None,
                note: None,
            },
            policy: PolicyDecision {
                decision_id: "pol_x".into(),
                outcome: PolicyOutcome::Allow,
                reason: "ok".into(),
                local_only: true,
                retention_class: "standard".into(),
                redaction_profile: "default".into(),
                sync_mode: SyncMode::LocalOnly,
                approval_required: false,
            },
            generated_outputs: vec![],
        }
    }

    #[test]
    fn index_includes_provenance_lines() {
        let when = DateTime::parse_from_rfc3339("2026-05-07T16:00:01+00:00").unwrap();
        let body = MarkdownRenderer::new().render_index(when, &[record()]);
        assert!(body.contains("# Dore LLM Wiki"));
        assert!(body.contains("[[evi_x]] Smoke note"));
        assert!(body.contains("Kind: note"));
        assert!(body.contains("Provenance: manual_cli"));
        assert!(body.contains("Payload SHA-256: abc"));
        assert!(body.contains("Captured: 2026-05-07T16:00:00+00:00"));
    }

    #[test]
    fn log_entry_starts_with_timestamped_header() {
        let when = DateTime::parse_from_rfc3339("2026-05-07T16:00:01+00:00").unwrap();
        let entry = MarkdownRenderer::new().render_log_entry(
            when,
            "job_y",
            &["evi_x".into()],
            &["memory/wiki/index.md".into(), "memory/wiki/log.md".into()],
            "manual_cli",
        );
        assert!(entry.starts_with("## [2026-05-07T16:00:01+00:00] wiki_generate | job_y"));
        assert!(entry.contains("Evidence: evi_x"));
    }
}
