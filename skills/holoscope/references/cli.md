---
name: holoscope-cli
description: Langfuse CLI usage against a HoloScope endpoint — install, resource/action discovery, credentials, the documented API surface, and deployment-dependent gaps. Use for further tips on using the Langfuse CLI with HoloScope.
metadata:
  required_access:
    - HOLOSCOPE_PROJECT_INTERFACE
---

# Langfuse CLI against HoloScope

Set the credentials below to target HoloScope. Use `--api-version 3.225.3` for legacy reads; select newer schemas per operation, not globally. The current CLI requires Node.js 20 or newer. CLI docs: https://langfuse.com/docs/api-and-data-platform/features/cli

## Install

```bash
# Run directly (recommended)
npx @langfuse/cli api --api-version 3.225.3 <resource> <action>
bunx @langfuse/cli api --api-version 3.225.3 <resource> <action>

# Or install globally
npm i -g @langfuse/cli
langfuse api --api-version 3.225.3 <resource> <action>
```

The legacy `langfuse-cli` package currently mirrors `@langfuse/cli`, but the scoped package is the supported default.

## Discovery

```bash
# List all resources and auth info
langfuse api --api-version 3.225.3 __schema

# List actions for a resource
langfuse api --api-version 3.225.3 <resource> --help

# Show args/options for a specific action
langfuse api --api-version 3.225.3 <resource> <action> --help

# Preview the curl command without executing
langfuse api --api-version 3.225.3 <resource> <action> --curl
```

Use the same selected API snapshot for discovery, preview, and execution; the examples above select legacy reads. `__schema` lists the FULL Langfuse API, not this instance's capabilities. Cross-check the method/path against SKILL.md and the current HoloScope contract. Treat `--curl` output as secret-bearing: inspect locally, redact auth headers, and never paste raw previews into chat or logs.

## Capability check

- Verify the intended project with a `DEFAULT` key and a supported authenticated read; Console/POP identity is not a substitute for public API key credentials. A `TRACE_INGESTION` key cannot call `GET /api/public/projects` or use that SDK auth check; its access is limited to Trace/Observation ingestion. Do not infer write permission from read success.
- The official health handler is unauthenticated, but the public Agent gateway requires Basic key routing and enforces IP policy even for health. Send configured credentials when checking the public endpoint; a direct Web health response does not validate that gateway path.
- Probe only resources needed by the task and include their required parameters. A 400 is a request error, 401/403 an authentication/authorization issue, and a 404 needs route/version investigation rather than an automatic downgrade to "unsupported". On HoloScope, `X-HoloScope-Gateway-Error: true` identifies a gateway rejection; a 404 without it reached the backend and may indicate a deployment-version gap. Do not work around denied access with another identity.
- Keep a brief operation report: method/path, schema version, status, and evidence. A CLI-side rejection without an HTTP request is a schema limitation, not a server response.
- HoloScope custom evaluator contracts may be absent or different in the pinned CLI schema. Inspect `versions list` and schema/help; if no snapshot matches, use an authenticated request following the current HoloScope contract and the same write approval rules. Do not invent command names or force a mismatched payload through the CLI.
- SDK majors describe instrumentation compatibility, not every experiment runner. Inspect the actual APIs a runner uses before selecting it; if it requires unsupported endpoints, use the verified legacy dataset-run flow instead.
- Use a verified deployment's Session HTTP contract with authorization for bounded validation; check the target's capabilities before enabling a rule.

## Credentials

```bash
export LANGFUSE_PUBLIC_KEY=pk-...
export LANGFUSE_SECRET_KEY=sk-...
export LANGFUSE_BASE_URL=<HoloScope endpoint>   # console: HoloScope服务 -> 概览 -> 连接管理
```

## Tips

- **Pin `--api-version 3.225.3` for legacy v1 reads.** The default 4.x snapshot can reject `traces`/`observations`/`sessions` and suggest unsupported v2 observations. This pin was verified against a backend reporting 3.212.0; it is neither a claim that all HoloScope instances run 3.x nor a requirement for evaluator APIs. `langfuse api versions list` shows bundled snapshots.
- Use `--json` for a machine-readable `{status, headers, body}` envelope; list results are under `.body.data`. Use `--curl` to preview the HTTP request without executing.
- All list commands support filtering — check `<resource> <action> --help` for available options
- Scores: create via `POST /api/public/scores`. `GET /api/public/v3/scores` always returns core fields, so omit `core` from `fields`. The documented extra groups are `details`, `subject`, and `annotation`; request `fields=details,subject` for `comment`, `metadata`, and typed target association. A core-only response is insufficient when verification requires explanations or target associations.
- Score v3 uses `meta.cursor` for pagination, not `page`/`totalPages`. `traceId`, `sessionId`, and `experimentId` are mutually exclusive; `observationId` requires `traceId`.
- Legacy Score v2 uses `page`/`limit`; `fields` defaults to `score,trace` and must include `score`. Filtering by `userId` or `traceTags` requires `trace` in `fields`; those filters are not supported by v3. Keep each version's field groups and pagination separate.
- Legacy ingestion: HTTP 207 is not whole-batch success; inspect `errors[]` before reconciling writes. `batch[].id` is the deduplication event ID, while `batch[].body.id` identifies the business object. Retain event IDs when retrying the same submission; use new event IDs for new updates to an existing object.
- Media: POST to request an upload URL, PUT the original bytes only when `uploadUrl` is non-empty, then PATCH the actual result. Send the original `Content-Type` and `Content-Length` plus all returned `uploadHeaders`, without HoloScope Basic credentials: common signed headers may be absent from `uploadHeaders`. The signed storage host must be reachable from the Agent's network; an internal/VPC-only host prevents upload from a public runtime. An empty URL may indicate an existing upload; verify before claiming completion.
- Media PATCH compatibility: the [official parameter table](https://help.aliyun.com/zh/hologres/user-guide/holoscope-service-api-list#h2-sec-api-patchmedia) marks `uploadedAt` and `uploadHttpStatus` optional. Send actual values for both when reporting an upload result; check required fields against the target contract or a returned validation error.
- Media encoding compatibility: the official example uses a 64-character hex `sha256Hash`. Confirm whether hex or 44-character Base64 is required by the target contract before uploading; do not treat the encodings as interchangeable or claim compatibility while it remains unverified.
- Trace deletion cascades to scores. Never delete a trace to undo an unwanted score. Correct scores through verified update semantics with approval; delete only explicitly approved disposable resources.
- Reads are eventually consistent (observed ~5s lag on dataset run items). Use bounded backoff and a deadline; paginate readbacks and check identity/content/associations. On timeout report pending verification, not success or a reason to blindly repeat the write.
- Session time is timezone-shifted: `GET /api/public/sessions` and `GET /api/public/sessions/{sessionId}` return `createdAt` in the backend default timezone (Asia/Shanghai, UTC+8) while labeling it `Z`; `traces.timestamp` is true UTC. Treat the offset as instance-specific rather than fixed — verify it by cross-checking a session against its own traces before filtering, sorting, or windowing by session time (verified).
- Pagination on the v1 endpoints is page-based (`--limit`/`--page`); responses carry `meta: {page, limit, totalItems, totalPages}`.
