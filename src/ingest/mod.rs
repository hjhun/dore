pub mod normalizer;
pub mod service;

pub use normalizer::EvidenceNormalizer;
pub use service::{IngestRequest, IngestResult, IngestSourceKind, IngestionService};
