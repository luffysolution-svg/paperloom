# AI Proxy, Conversations, and Public Operation Control

[API spec index](../../API_SPEC.md) ·
[internal Agent execution contract](agent-document-operations.md)

This page describes the Rust-owned public control plane used by the web client.
The Python AI service produces answers and Agent events, but Rust remains the
authenticated public entrypoint and the only writer for conversations,
operations, attempts, events, and document versions.

## AI service proxy

The application owns one reusable AI gateway. Its endpoint and timeout settings
are captured at startup; restart after changing them. The endpoint uses
`RUST_API_AI_SERVICE_BASE` when set, otherwise the configured sidecar host/port.
Supervisor health is supplied by app assembly; the supervisor's existing
process-wide health source is unchanged. Unsupervised mode still permits a
manually started sidecar.

| Setting | Default | Scope |
| --- | --- | --- |
| `RUST_API_AI_PROXY_CONNECT_TIMEOUT_SECS` | 3 | Establish connection |
| `RUST_API_AI_PROXY_HEADER_TIMEOUT_SECS` | 120 | Send request and obtain response headers |
| `RUST_API_AI_PROXY_IDLE_TIMEOUT_SECS` | 30 | Maximum wait for the next upstream read |
| `RUST_API_AI_PROXY_CONFIG_TIMEOUT_SECS` | 15 | Complete runtime-config request, including body |

### Connection reuse and keep-alive

Two settings on opposite sides of the same socket used to collide. The
supervisor probes `/readyz` every `RUST_API_AI_HEALTH_INTERVAL_SECS` (default
`5`), and uvicorn's own `timeout_keep_alive` also defaults to `5` — so the
server closed the idle connection at the same moment the probe reused it, the
request was reset in flight, and the log alternated
`health probe failed` / `health recovered` at exactly one probe interval. The
`/readyz` handler itself answers in about a millisecond and the AI service log
is clean throughout; nothing was wrong on the server.

Two independent changes, because the two callers want different things:

- The supervisor's probe client keeps **no idle connections** and opens a fresh
  one per probe. That removes the race outright rather than making it rarer,
  and it does not depend on the server's configuration — which matters because
  the probe interval is user-tunable and could be raised past any fixed
  keep-alive window.
- The AI service now takes `RETAIN_AI_KEEP_ALIVE_TIMEOUT_S` (default `75`) and
  passes it to uvicorn. The proxy gateway that carries real user traffic *does*
  pool connections, and a five-second idle window is easy to land on by
  accident. Note this widens the window rather than eliminating it: any finite
  keep-alive leaves a race with a pooling client. Closing it completely would
  mean retrying idempotent requests in the gateway, which is a separate change.

The latter three settings have a minimum of one second. The header default exceeds
the normal 90-second AI request deadline because non-streaming asks send their
headers only after producing an answer. Body idle timing starts after headers.
Ask streams have no
gateway total-duration cap: the idle limit should exceed the AI service heartbeat
interval (normally five seconds). Failures before downstream headers are sent
return 502; failures during an already-open stream terminate the body, not a
replacement HTTP status or fabricated `done` event. Runtime-config remains
buffered with `Cache-Control: no-store`.

Python stream cancellation is tied explicitly to ASGI disconnect/send failure,
not generator garbage collection. Request-owned transports are cancelled and
late runtime results are not persisted; this remains cooperative cancellation,
not a guarantee of terminating arbitrary third-party runtime code or refunding
tokens already processed by a provider.

```text
POST /api/v1/ai/ask
GET  /api/v1/ai/runtime-config
PUT  /api/v1/ai/runtime-config
```

Rust forwards these routes to the supervised AI service's `/v1/ask` and
`/v1/runtime-config` endpoints. `POST /api/v1/ai/ask` preserves the upstream
status, content type, and streaming body, so SSE event order and error payloads
come from the AI service. Runtime-config responses are buffered and use
`Cache-Control: no-store`. The caller's Rust `X-API-Key` is forwarded to the
sidecar; model and Gateway credentials are never returned in cleartext.

The ask payload and SSE/result fields are defined by
[`services/contracts/ai-ask.v1.schema.json`](../../../contracts/ai-ask.v1.schema.json).
Runtime configuration updates and redacted views are defined by
[`services/contracts/runtime-config.v1.schema.json`](../../../contracts/runtime-config.v1.schema.json).
Runtime-config update bodies reject unknown fields so misspelled settings cannot
silently return success without taking effect.
Important state rules are:

- `assistant_mode=reading` selects document retrieval without operation tools;
- `assistant_mode=operations` selects the configured operation-capable runtime;
- a document-scoped `auto` request fails with `409` when the selected runtime
  can operate on a PDF but cannot read its content, rather than silently
  changing capabilities;
- `agent_session` identifies the actual runtime and durable request message;
- `agent_operation` is only a refresh hint; clients must query the operation
  endpoint below for authoritative state;
- `agent_confirmation_required` and `confirmation_requests` are host-generated
  action descriptions. Clients must not parse model prose for authority;
- `done.persisted=false` means the answer was produced but conversation writeback
  was not durable.

In `explicit` mode, an Agent turn may create a draft, but run/commit/retry need
independent user confirmation through `confirm_document_operation=true` on a
new ask request. `green_light` supplies that host confirmation automatically;
it does not bypass operation state, idempotency, candidate validation, or
document-version compare-and-swap checks.

## Durable conversation tree

```text
POST   /api/v1/ai/conversations
GET    /api/v1/ai/conversations
POST   /api/v1/ai/conversations/fork
GET    /api/v1/ai/conversations/{conversation_id}
PATCH  /api/v1/ai/conversations/{conversation_id}
DELETE /api/v1/ai/conversations/{conversation_id}
POST   /api/v1/ai/conversations/{conversation_id}/messages
```

The request and response shapes are defined by
[`services/contracts/ai-conversations.v1.schema.json`](../../../contracts/ai-conversations.v1.schema.json).
Messages form a tree through `parent_id`; `head_id` chooses the visible leaf.
Appending without `parent_id` attaches to the current head. Stable client
`message_id` values make a request retry safe after an uncertain network
response. A document-scoped conversation must reference an existing document.

Conversation listing accepts `limit`, `offset`, and optional `document_id`.
The default limit is `50`, clamped to `1..200`. The response contains
`conversations`, `total`, the effective `limit`, `offset`, and `has_more`;
counts use the same optional document scope as the returned page.

The operation-capable AI path durably appends the user message before invoking
the runtime. That message id becomes the operation's `request_message_id`, so a
browser disconnect cannot leave a created operation attached only to transient
model state. The final assistant message is appended after the runtime returns;
write failure is surfaced through `persisted=false`.

## Public operation projection and actions

```text
GET  /api/v1/ai/conversations/{conversation_id}/operations?limit=50&offset=0
GET  /api/v1/ai/operations/{operation_id}
POST /api/v1/ai/operations/{operation_id}/run
POST /api/v1/ai/operations/{operation_id}/retry
POST /api/v1/ai/operations/{operation_id}/cancel
POST /api/v1/ai/operations/{operation_id}/commit
GET  /api/v1/ai/operations/{operation_id}/candidate.pdf
```

The list is conversation-scoped, clamps `limit` to `1..100`, defaults omitted
`offset` to zero, and sorts by `updated_at DESC, operation_id DESC` so equal
timestamps remain deterministic. Its response contains `operations`, `total`,
the effective `limit`, `offset`, and `has_more`. Existing callers that send only
`limit` remain compatible. Public operation items use schema
[`public_document_operation_v1`](../../../contracts/public-document-operation.v1.schema.json)
and expose only safe plan, status, attempt, candidate, failure, allowed-action,
and event projections. They do not expose workspace paths, internal manifests,
request bodies, capabilities, credentials, or signed provider URLs.

Each action request uses this concurrency envelope:

```json
{
  "schema": "document_operation_action_v1",
  "idempotency_key": "stable-client-action-id",
  "expected_status": "result_ready",
  "expected_attempt": 1,
  "expected_program_sha256": "64-character-program-sha256",
  "reason": "optional cancellation reason",
  "accept_duplicate_risk": false
}
```

The client must copy `expected_status`, `expected_attempt`, and
`expected_program_sha256` from the last authoritative operation view. A newer
status/attempt or changed program returns `409`; replaying the same successful
idempotency key is accepted only when it matches the recorded action/attempt.
`retry` is valid for `failed` or `ambiguous`; an ambiguous retry additionally
requires `accept_duplicate_risk=true`.

`allowed_actions` is the backend projection to render:

- `draft` / `awaiting_confirmation`: `run`, `cancel`;
- `queued` / `running` / `validating`: `cancel`;
- `result_ready`: `commit`, `cancel`;
- `failed` / `ambiguous`: `retry`;
- `committed` / `cancelled`: no further action.

Candidate download is available only from `result_ready` or `committed`. Rust
revalidates the version identity, active attempt path, regular-file boundary,
data-root containment, and SHA-256 before streaming the PDF.

These public routes never create a program or mint a capability. Program
creation and executor dispatch remain behind the backend-only routes described
in the [internal Agent execution contract](agent-document-operations.md).
