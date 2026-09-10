---
name: holoscope-cli
description: Langfuse CLI usage against a HoloScope endpoint — install, resource/action discovery, credentials, and which CLI resources work vs 404. Use for further tips on using the Langfuse CLI with HoloScope.
metadata:
  required_access:
    - LANGFUSE_PROJECT_INTERFACE
---

# Langfuse CLI against HoloScope

The `langfuse-cli` works against HoloScope: set the credentials below and every call goes to the HoloScope endpoint. **Always pass `--api-version 3.225.3`** (see Tips). CLI docs: https://langfuse.com/docs/api-and-data-platform/features/cli

## Install

```bash
# Run directly (recommended)
npx langfuse-cli api --api-version 3.225.3 <resource> <action>
bunx langfuse-cli api --api-version 3.225.3 <resource> <action>

# Or install globally
npm i -g langfuse-cli
langfuse api --api-version 3.225.3 <resource> <action>
```

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

`__schema` lists the FULL Langfuse API, including resources HoloScope does not serve. Cross-check the target endpoint (via `--curl`) against the supported API surface in SKILL.md before calling.

## Credentials

```bash
export LANGFUSE_PUBLIC_KEY=pk-...
export LANGFUSE_SECRET_KEY=sk-...
export LANGFUSE_BASE_URL=<HoloScope endpoint>   # console: HoloScope服务 -> 概览 -> 连接管理
export LANGFUSE_HOST="$LANGFUSE_BASE_URL"
```

## Tips

- **Always pass `--api-version 3.225.3`** (or `export LANGFUSE_API_VERSION=3.225.3`). The CLI's default 4.x snapshot marks the v1 read endpoints (`GET /traces`, `/observations`, `/sessions`) as deprecated and refuses to call them, pointing to `GET /v2/observations` — which HoloScope does not serve. On the 3.x snapshot, `traces`/`observations`/`sessions` map to the v1 endpoints and work (verified against a HoloScope backend reporting Langfuse 3.212.0). `langfuse api versions list` shows bundled snapshots.
- Use `--json` for machine-readable JSON output; `--curl` to preview the HTTP request without executing
- All list commands support filtering — check `<resource> <action> --help` for available options
- Scores: create via `POST /api/public/scores`. Read via v3 (`GET /api/public/v3/scores`) for slim records (no `traceId`/`observationId`/`comment`/`metadata` in the response; typed `value`), or v2 (`GET /api/public/v2/scores`) when you need those association fields — the data is stored either way, v3 just doesn't return it.
- `prompts`, `metrics`, `annotation-queues`, `comments`, `score-configs`, `models`, and org/project-management resources 404 despite appearing in `__schema` (verified).
- Reads are eventually consistent: a list right after a write can come back empty (observed ~5s lag on dataset run items). Retry after a few seconds before concluding the write failed.
- Pagination on the v1 endpoints is page-based (`--limit`/`--page`); responses carry `meta: {page, limit, totalItems, totalPages}`.
