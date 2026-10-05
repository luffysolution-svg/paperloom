//! Bounded, in-flight-only execution of blocking read work.
//! Admitted work keeps its capacity even when every HTTP caller disconnects.
use std::{
    any::{Any, TypeId},
    collections::HashMap,
    sync::{Arc, Mutex},
    time::Instant,
};

use tokio::sync::{watch, Semaphore};

use crate::error::AppError;

type QueryKey = (TypeId, String);
type SharedValue = Arc<dyn Any + Send + Sync>;
type Outcome = Result<SharedValue, AppError>;
type Completion = watch::Sender<Option<Outcome>>;

pub struct QueryExecution {
    slots: Arc<Semaphore>,
    in_flight: Mutex<HashMap<QueryKey, Completion>>,
    max_keys: usize,
}

impl Default for QueryExecution {
    fn default() -> Self {
        Self::with_limits(2, 128)
    }
}

impl QueryExecution {
    fn with_limits(slots: usize, max_keys: usize) -> Self {
        Self {
            slots: Arc::new(Semaphore::new(slots.max(1))),
            in_flight: Mutex::new(HashMap::new()),
            max_keys: max_keys.max(1),
        }
    }

    pub async fn run<T>(
        self: &Arc<Self>,
        key: String,
        work: impl FnOnce() -> Result<T, AppError> + Send + 'static,
    ) -> Result<T, AppError>
    where
        T: Clone + Send + Sync + 'static,
    {
        // Result types are part of the key: equal user keys cannot accidentally
        // share incompatible values from separate read operations.
        let key = (TypeId::of::<T>(), key);
        let mut completion = {
            let mut in_flight = self.in_flight.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(existing) = in_flight.get(&key) {
                existing.subscribe()
            } else {
                // Running and queued distinct keys both count toward admission.
                // Existing-key callers can still join at full capacity.
                if in_flight.len() >= self.max_keys {
                    return Err(AppError::too_many_requests("query execution queue is full"));
                }
                let (sender, receiver) = watch::channel(None);
                in_flight.insert(key.clone(), sender.clone());
                tracing::debug!(admitted_queries = in_flight.len(), "query work admitted");
                let owner = Arc::clone(self);
                // No await between admission and spawning the supervisor, so a
                // dropped caller cannot leave an ownerless in-flight entry.
                tokio::spawn(async move {
                    let started = Instant::now();
                    let outcome = match owner.slots.clone().acquire_owned().await {
                        Ok(permit) => {
                            match tokio::task::spawn_blocking(move || {
                                // The actual blocking reader owns its permit,
                                // independent of request/supervisor cancellation.
                                let _permit = permit;
                                work().map(|value| Arc::new(value) as SharedValue)
                            })
                            .await
                            {
                                Ok(result) => result,
                                Err(_) => Err(AppError::internal("query execution task failed")),
                            }
                        }
                        Err(_) => Err(AppError::service_unavailable("query execution unavailable")),
                    };
                    let mut in_flight = owner.in_flight.lock().unwrap_or_else(|e| e.into_inner());
                    // No historical result cache: completed reads must not hide
                    // changes in files or another process's committed DB state.
                    sender.send_replace(Some(outcome));
                    in_flight.remove(&key);
                    tracing::debug!(
                        elapsed_ms = started.elapsed().as_millis() as u64,
                        admitted_queries = in_flight.len(),
                        "query work completed"
                    );
                });
                receiver
            }
        };
        loop {
            if let Some(outcome) = completion.borrow_and_update().clone() {
                return outcome.and_then(|value| {
                    value
                        .downcast_ref::<T>()
                        .cloned()
                        .ok_or_else(|| AppError::internal("query execution result type mismatch"))
                });
            }
            if completion.changed().await.is_err() {
                return Err(AppError::internal("query execution task unavailable"));
            }
        }
    }
}

#[cfg(test)]
mod tests;
