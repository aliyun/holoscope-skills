# Agent Instructions

## Adding or Improving a HoloScope Use Case

Follow these rules after every edit:

- **Only add content that beats the docs.** Check current HoloScope product documentation first, then the applicable Langfuse SDK/API documentation for compatibility mechanics. Add only HoloScope-specific constraints, tested differences, or workflow judgment that an agent cannot obtain directly from those sources.
- **Keep the top-level trigger concise.** `skills/holoscope/SKILL.md` frontmatter should trigger on HoloScope and Hologres agent-observability requests; detailed routing belongs inside the skill.
- **Put "when to use" guidance in exactly two places:** one one-line entry per reference under `## Use case specific references` in `SKILL.md`, and the reference frontmatter `description`. Do not add routing prose to reference bodies.
- **Every reference must declare `metadata.required_access`.** Use only:
  - `CODEBASE` — reads or edits the user's source code
  - `HOLOSCOPE_PROJECT_INTERFACE` — reaches HoloScope through CLI, API, or MCP commands
  - `HOLOSCOPE_PROJECT_SCRIPT` — runs SDK code that connects to HoloScope
  - `GITHUB` — operates on GitHub through `gh`
- **Every line must earn its place.** References must be at most 100 lines including frontmatter. Remove filler, repetition, and details available from linked documentation.
- **Do not commit SDK examples that will go stale.** Link current documentation; use pseudo-code only when the workflow logic itself needs explanation.
- **Be cautious with `allowed-tools`.** Auto-allow only read-only, product-specific commands that users would consider routine. Authenticated writes still require explicit permission.

## Compatibility Boundaries

- Treat the supported API surface in `skills/holoscope/SKILL.md` as authoritative. Unlisted Langfuse endpoints are unavailable until verified against HoloScope.
- Preserve exact technical names such as `langfuse-cli`, Langfuse SDK package names, Langfuse compatibility documentation, and `LANGFUSE_*` environment variables where HoloScope depends on them. They describe the compatibility layer, not the plugin identity.
- Prefer OTel-based SDK majors and HoloScope's documented ingestion path.
- Never claim an endpoint or SDK behavior works from upstream documentation alone. Test it against an authorized HoloScope environment and record meaningful behavioral differences.
- Never commit credentials, private endpoints, customer data, or generated test payloads.

## Plugin Version Bumps

The repository ships three manifests:

- `.claude-plugin/plugin.json`
- `.cursor-plugin/plugin.json`
- `.codex-plugin/plugin.json`

Claude and Cursor versions must remain in lockstep. Codex is versioned independently, but every changed manifest must receive an appropriate bump in the same merge request.

Follow SemVer:

- **Patch:** corrections and clarifications that do not change supported workflows.
- **Minor:** meaningful new non-breaking capability.
- **Major:** removing or renaming the skill, changing plugin identifiers, or otherwise breaking existing invocation or installation.

Do not bump versions for repository tooling, formatting, or documentation-only changes outside published skill and plugin metadata.

## Reviewing Changes

Read every changed skill file as an agent opening it mid-task. Confirm that each instruction is actionable, concise, and addressed to the runtime agent rather than the skill author.

Check all of the following:

- HoloScope product documentation and applicable Langfuse compatibility documentation were checked.
- The addition provides HoloScope-specific value beyond those docs.
- A new reference is necessary rather than extending an existing one.
- Every reference is at most 100 lines and contains no stale committed code.
- `metadata.required_access` is present and uses only allowed tokens.
- Routing appears exactly once in `SKILL.md` and once in reference frontmatter.
- The API surface reflects verified HoloScope behavior, including unavailable and v4-gated endpoints.
- Claude and Cursor manifest versions match and all changed manifests follow SemVer.
- No credentials, internal test data, or unrelated product branding is introduced.

Prioritize correctness and runtime usefulness over formatting. If the change is clean against these checks, say so plainly.
