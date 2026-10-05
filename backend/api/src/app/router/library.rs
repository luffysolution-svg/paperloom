use axum::routing::{get, post};
use axum::Router;

use crate::app::AppState;
use crate::routes::{library, library_data};

pub(super) fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/v1/library/books", get(library::list_books))
        .route("/api/v1/library/books/delete", post(library::delete_books))
        .route(
            "/api/v1/library/books/:job_id",
            get(library::get_book).delete(library::delete_book),
        )
        .route(
            "/api/v1/library/books/:job_id/favorites",
            axum::routing::delete(library_data::clear_book_favorites_route),
        )
        .route(
            "/api/v1/library/books/:job_id/cover",
            get(library::download_book_cover),
        )
        .route(
            "/api/v1/library/books/:job_id/thumbnail",
            get(library::download_book_thumbnail),
        )
}
