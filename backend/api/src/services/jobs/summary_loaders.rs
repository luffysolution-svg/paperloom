#[path = "summary_loaders/glossary.rs"]
mod glossary;
#[path = "summary_loaders/invocation.rs"]
mod invocation;
#[path = "summary_loaders/normalization.rs"]
mod normalization;
#[path = "summary_loaders/shared.rs"]
mod shared;

pub(crate) use shared::SummaryCache;
