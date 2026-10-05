use super::ReplayDeps;
use crate::db::Db;
use std::path::Path;

#[derive(Clone)]
pub(crate) struct QueryJobsDeps<'a> {
    pub(crate) db: &'a Db,
    pub(crate) data_root: &'a Path,
    pub(crate) replay: ReplayDeps<'a>,
}

impl<'a> QueryJobsDeps<'a> {
    pub(crate) fn new(db: &'a Db, data_root: &'a Path, replay: ReplayDeps<'a>) -> Self {
        Self {
            db,
            data_root,
            replay,
        }
    }
}
