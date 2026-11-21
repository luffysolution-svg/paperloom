use super::*;
use std::{
    sync::atomic::{AtomicUsize, Ordering},
    time::Duration,
};
use tokio::sync::mpsc;

async fn wait_for_joiners<T: 'static>(execution: &QueryExecution, key: &str, count: usize) {
    tokio::time::timeout(Duration::from_secs(3), async {
        loop {
            let receivers = execution
                .in_flight
                .lock()
                .unwrap()
                .get(&(TypeId::of::<T>(), key.to_string()))
                .map(|sender| sender.receiver_count())
                .unwrap_or(0);
            if receivers >= count {
                break;
            }
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("callers joined query work");
}

#[tokio::test(flavor = "current_thread")]
async fn blocking_reads_do_not_block_single_thread_runtime_timers() {
    let execution = Arc::new(QueryExecution::default());
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let (release_tx, release_rx) = std::sync::mpsc::channel();
    let owner = execution.clone();
    let task = tokio::spawn(async move {
        owner
            .run("reader:metadata".into(), move || {
                started_tx.send(()).unwrap();
                // Timeout also prevents a faulty synchronous implementation
                // from hanging the test forever.
                release_rx
                    .recv_timeout(Duration::from_secs(3))
                    .expect("runtime timer released blocking reader");
                Ok(42u32)
            })
            .await
    });
    started_rx.recv().await.unwrap();
    tokio::time::sleep(Duration::from_millis(10)).await;
    release_tx.send(()).expect("reader is still waiting");
    assert_eq!(task.await.unwrap().unwrap(), 42);
}

#[tokio::test]
async fn same_key_shares_work_and_completed_values_are_not_cached() {
    let execution = Arc::new(QueryExecution::default());
    let calls = Arc::new(AtomicUsize::new(0));
    let (release_tx, release_rx) = std::sync::mpsc::channel();
    let owner = execution.clone();
    let count = calls.clone();
    let first = tokio::spawn(async move {
        owner
            .run("events:job".into(), move || {
                count.fetch_add(1, Ordering::SeqCst);
                release_rx.recv_timeout(Duration::from_secs(3)).unwrap();
                Ok(vec![1u32, 2])
            })
            .await
    });
    wait_for_joiners::<Vec<u32>>(&execution, "events:job", 1).await;
    let owner = execution.clone();
    let count = calls.clone();
    let second = tokio::spawn(async move {
        owner
            .run("events:job".into(), move || {
                count.fetch_add(1, Ordering::SeqCst);
                Ok(vec![99u32])
            })
            .await
    });
    wait_for_joiners::<Vec<u32>>(&execution, "events:job", 2).await;
    release_tx.send(()).unwrap();
    assert_eq!(first.await.unwrap().unwrap(), vec![1, 2]);
    assert_eq!(second.await.unwrap().unwrap(), vec![1, 2]);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert!(execution.in_flight.lock().unwrap().is_empty());
    assert_eq!(
        execution
            .run("events:job".into(), || Ok(vec![3u32]))
            .await
            .unwrap(),
        vec![3]
    );
}

#[tokio::test]
async fn identical_keys_with_different_result_types_do_not_share() {
    let execution = Arc::new(QueryExecution::default());
    let (release_tx, release_rx) = std::sync::mpsc::channel();
    let owner = execution.clone();
    let first = tokio::spawn(async move {
        owner
            .run("job".into(), move || {
                release_rx.recv_timeout(Duration::from_secs(3)).unwrap();
                Ok(7u32)
            })
            .await
    });
    wait_for_joiners::<u32>(&execution, "job", 1).await;
    assert_eq!(
        execution
            .run("job".into(), || Ok("metadata".to_string()))
            .await
            .unwrap(),
        "metadata"
    );
    release_tx.send(()).unwrap();
    assert_eq!(first.await.unwrap().unwrap(), 7);
}

#[tokio::test]
async fn distinct_keys_respect_running_capacity() {
    let execution = Arc::new(QueryExecution::with_limits(1, 128));
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let (release_tx, release_rx) = std::sync::mpsc::channel();
    let owner = execution.clone();
    let started = started_tx.clone();
    let first = tokio::spawn(async move {
        owner
            .run("first".into(), move || {
                started.send(1).unwrap();
                release_rx.recv_timeout(Duration::from_secs(3)).unwrap();
                Ok(1u32)
            })
            .await
    });
    assert_eq!(started_rx.recv().await.unwrap(), 1);
    let owner = execution.clone();
    let second = tokio::spawn(async move {
        owner
            .run("second".into(), move || {
                started_tx.send(2).unwrap();
                Ok(2u32)
            })
            .await
    });
    wait_for_joiners::<u32>(&execution, "second", 1).await;
    assert!(
        tokio::time::timeout(Duration::from_millis(20), started_rx.recv())
            .await
            .is_err()
    );
    release_tx.send(()).unwrap();
    assert_eq!(started_rx.recv().await.unwrap(), 2);
    assert_eq!(first.await.unwrap().unwrap(), 1);
    assert_eq!(second.await.unwrap().unwrap(), 2);
}

#[tokio::test]
async fn full_admission_rejects_new_keys_but_allows_existing_joiners() {
    let execution = Arc::new(QueryExecution::with_limits(1, 1));
    let (release_tx, release_rx) = std::sync::mpsc::channel();
    let owner = execution.clone();
    let first = tokio::spawn(async move {
        owner
            .run("first".into(), move || {
                release_rx.recv_timeout(Duration::from_secs(3)).unwrap();
                Ok(1u32)
            })
            .await
    });
    wait_for_joiners::<u32>(&execution, "first", 1).await;
    let rejected = execution.run("second".into(), || Ok(2u32)).await;
    assert!(matches!(rejected, Err(AppError::TooManyRequests(_))));
    let owner = execution.clone();
    let joined = tokio::spawn(async move {
        owner
            .run::<u32>("first".into(), || panic!("duplicate work"))
            .await
    });
    wait_for_joiners::<u32>(&execution, "first", 2).await;
    release_tx.send(()).unwrap();
    assert_eq!(first.await.unwrap().unwrap(), 1);
    assert_eq!(joined.await.unwrap().unwrap(), 1);
}

#[tokio::test]
async fn cancelled_callers_do_not_release_running_work_capacity() {
    let execution = Arc::new(QueryExecution::with_limits(1, 1));
    let (release_tx, release_rx) = std::sync::mpsc::channel();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let owner = execution.clone();
    let first = tokio::spawn(async move {
        owner
            .run("job".into(), move || {
                started_tx.send(()).unwrap();
                release_rx.recv_timeout(Duration::from_secs(3)).unwrap();
                Ok(1u32)
            })
            .await
    });
    started_rx.recv().await.unwrap();
    first.abort();
    assert!(first.await.unwrap_err().is_cancelled());
    assert_eq!(execution.slots.available_permits(), 0);
    assert!(matches!(
        execution.run("other".into(), || Ok(2u32)).await,
        Err(AppError::TooManyRequests(_))
    ));
    let owner = execution.clone();
    let joined = tokio::spawn(async move {
        owner
            .run::<u32>("job".into(), || panic!("duplicate work"))
            .await
    });
    wait_for_joiners::<u32>(&execution, "job", 1).await;
    release_tx.send(()).unwrap();
    assert_eq!(joined.await.unwrap().unwrap(), 1);
    assert_eq!(execution.slots.available_permits(), 1);
    assert!(execution.in_flight.lock().unwrap().is_empty());
}

#[tokio::test]
async fn cancelled_queued_callers_do_not_orphan_admitted_work() {
    let execution = Arc::new(QueryExecution::with_limits(1, 2));
    let (release_tx, release_rx) = std::sync::mpsc::channel();
    let (started_tx, mut started_rx) = mpsc::unbounded_channel();
    let owner = execution.clone();
    let first = tokio::spawn(async move {
        owner
            .run("running".into(), move || {
                started_tx.send(()).unwrap();
                release_rx.recv_timeout(Duration::from_secs(3)).unwrap();
                Ok(1u32)
            })
            .await
    });
    started_rx.recv().await.unwrap();
    let owner = execution.clone();
    let queued = tokio::spawn(async move { owner.run("queued".into(), || Ok(2u32)).await });
    wait_for_joiners::<u32>(&execution, "queued", 1).await;
    queued.abort();
    assert!(queued.await.unwrap_err().is_cancelled());
    assert_eq!(execution.in_flight.lock().unwrap().len(), 2);
    assert!(matches!(
        execution.run("extra".into(), || Ok(3u32)).await,
        Err(AppError::TooManyRequests(_))
    ));
    let owner = execution.clone();
    let joined = tokio::spawn(async move {
        owner
            .run::<u32>("queued".into(), || panic!("duplicate queued work"))
            .await
    });
    wait_for_joiners::<u32>(&execution, "queued", 1).await;
    release_tx.send(()).unwrap();
    assert_eq!(first.await.unwrap().unwrap(), 1);
    assert_eq!(joined.await.unwrap().unwrap(), 2);
    assert!(execution.in_flight.lock().unwrap().is_empty());
}

#[tokio::test]
async fn work_errors_and_panics_are_shared_and_then_retryable() {
    for panic_work in [false, true] {
        let execution = Arc::new(QueryExecution::with_limits(1, 1));
        let (release_tx, release_rx) = std::sync::mpsc::channel();
        let owner = execution.clone();
        let first = tokio::spawn(async move {
            owner
                .run::<u32>("job".into(), move || {
                    release_rx.recv_timeout(Duration::from_secs(3)).unwrap();
                    if panic_work {
                        panic!("simulated reader panic");
                    }
                    Err(AppError::not_found("artifact unavailable"))
                })
                .await
        });
        wait_for_joiners::<u32>(&execution, "job", 1).await;
        let owner = execution.clone();
        let second = tokio::spawn(async move {
            owner
                .run::<u32>("job".into(), || panic!("duplicate work"))
                .await
        });
        wait_for_joiners::<u32>(&execution, "job", 2).await;
        release_tx.send(()).unwrap();
        let first_error = first.await.unwrap().unwrap_err();
        let second_error = second.await.unwrap().unwrap_err();
        assert_eq!(first_error.to_string(), second_error.to_string());
        assert_eq!(execution.run("job".into(), || Ok(3u32)).await.unwrap(), 3);
    }
}
