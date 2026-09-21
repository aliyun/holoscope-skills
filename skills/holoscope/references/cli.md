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
langfuse api __schema

# List actions for a resource
langfuse api <resource> --help

# Show args/options for a specific action
langfuse api <resource> <action> --help

# Preview the curl command without executing
langfuse api <resource> <action> --curl
```

`__schema` lists the FULL Langfuse API, not this instance's capabilities. Cross-check the method/path against SKILL.md and the current HoloScope contract. Treat `--curl` output as secret-bearing: inspect locally, redact auth headers, and never paste raw previews into chat or logs.

## Capability check

- Verify the intended project with a supported authenticated read; console/POP identity is not a substitute for public API key credentials. Do not infer write permission from read success.
- Probe only resources needed by the task. Include required parameters, such as `fromStartTime` for experiment reads. A 400 is a request error, 401/403 an authentication/authorization issue, and a 404 needs route/version investigation rather than an automatic downgrade to "unsupported". On HoloScope, `X-HoloScope-Gateway-Error: true` identifies a gateway rejection; a 404 without it reached the backend and may indicate a deployment-version gap. Do not work around denied access with another identity.
- Keep a brief operation report: method/path, schema version, status, and evidence. A CLI-side rejection without an HTTP request is a schema limitation, not a server response.
- HoloScope custom evaluator contracts may be absent or different in the pinned CLI schema. Inspect `versions list` and schema/help; if no snapshot matches, use an authenticated request following the current HoloScope contract and the same write approval rules. Do not invent command names or force a mismatched payload through the CLI.
- SDK majors describe instrumentation compatibility, not every experiment runner. Inspect the actual APIs a runner uses before selecting it; if it requires unsupported endpoints, use the verified legacy dataset-run flow instead.

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
- Scores: create via `POST /api/public/scores`. `GET /api/public/v3/scores` returns only core fields by default; the HoloScope-verified `fields=core,details,subject` path returns `comment`, `metadata`, and typed target association and supports `traceId`/`observationId`/`experimentId` filters as applicable. A core-only response is insufficient when verification requires explanations or target associations.
- Trace deletion cascades to scores. Never delete a trace to undo an unwanted score. Score deletion exists in the upstream backend but is not listed in HoloScope's strict Agent compatibility surface; use it only if the target route and authorization are explicitly verified. Otherwise report corrections separately or use verified update semantics with approval. Delete only explicitly approved disposable resources.
- Strict-surface by-id gaps include `GET /media/{id}` and `GET /dataset-run-items/{id}`; no public dataset `DELETE` route is documented. A looser deployment may expose the upstream Media GET handler, but that is not portable HoloScope support.
- `prompts`, `metrics`, `annotation-queues`, `comments`, `score-configs`, `models`, and org/project-management resources are outside the documented strict Agent surface even when they appear in `__schema` or exist as upstream backend handlers. Treat observed availability as deployment-specific and verify the exact operation before relying on it.
- Reads are eventually consistent (observed ~5s lag on dataset run items). Use bounded backoff and a deadline; paginate readbacks and check identity/content/associations. On timeout report pending verification, not success or a reason to blindly repeat the write.
- Session time is timezone-shifted: `GET /sessions` and `GET /sessions/{id}` return `createdAt` in the backend default timezone (Asia/Shanghai, UTC+8) while labeling it `Z`; `traces.timestamp` is true UTC. Treat the offset as instance-specific rather than fixed — verify it by cross-checking a session against its own traces before filtering, sorting, or windowing by session time (verified).
- Pagination on the v1 endpoints is page-based (`--limit`/`--page`); responses carry `meta: {page, limit, totalItems, totalPages}`.
