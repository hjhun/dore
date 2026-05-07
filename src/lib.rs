//! Dore local-only LLM Wiki scaffold.
//!
//! This crate provides the first executable slice of the Dore personal-memory
//! system. It is intentionally local-only: raw evidence, generated wiki pages,
//! transcripts, recordings, secrets, graph outputs, and job reports never leave
//! the runtime root that the user controls.

pub mod cli;
pub mod core;
pub mod graphify;
pub mod ingest;
pub mod jobs;
pub mod policy;
pub mod runtime;
pub mod storage;
pub mod wiki;

pub use crate::core::error::DoreError;
