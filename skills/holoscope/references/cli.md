---
name: holoscope-cli
description: Langfuse CLI usage against a HoloScope endpoint — install, resource/action discovery, credentials, and which CLI resources work vs 404. Use for further tips on using the Langfuse CLI with HoloScope.
metadata:
  required_access:
    - LANGFUSE_PROJECT_INTERFACE
---

# Langfuse CLI against HoloScope

The `langfuse-cli` works against HoloScope: set the credentials below and every call goes to the HoloScope endpoint. CLI docs: https://langfuse.com/docs/api-and-data-platform/features/cli

## Install

```bash
# Run directly (recommended)
npx langfuse-cli api <resource> <action>
bunx langfuse-cli api <resource> <action>

# Or install globally
npm i -g langfuse-cli
langfuse api <resource> <action>
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

- Use `--json` for machine-readable JSON output; `--curl` to preview the HTTP request without executing
- All list commands support filtering — check `<resource> <action> --help` for available options
- **Observations and traces: use the v1 read endpoints.** HoloScope serves only `GET /api/public/observations` and `GET /api/public/traces` (v1) — the modern v2 `observations` resource 404s. This inverts the upstream Langfuse guidance of preferring v2; on HoloScope, pick the CLI resource whose underlying path (check with `--curl`) is the v1 one.
- Scores: create via `POST /api/public/scores`; list via the v3 (`GET /api/public/v3/scores`) or v2 path.
- `prompts`, `metrics`, `annotation-queues`, `comments`, `score-configs`, `models`, and org/project-management resources 404 despite appearing in `__schema`.
- Pagination on the v1 endpoints is page-based: `--limit` and `--page`.
