# Contributing

## Proposing a change

Open a merge request with a focused description of what the change improves and how it was verified. Read [AGENTS.md](./AGENTS.md) before editing the skill.

Keep credentials and test payloads outside the repository. Never commit HoloScope Public Keys, Secret Keys, endpoints that are not public documentation, or customer data.

## Testing a skill change

1. Validate that `skills/holoscope/SKILL.md` routes every reference exactly once.
2. Keep every reference at 100 lines or fewer and preserve valid `metadata.required_access` values.
3. Test changed HoloScope API behavior against an authorized environment, then read back created data to verify semantics rather than status codes alone.
4. Tag test data clearly and delete it after verification. Never delete built-in evaluators or unrelated project data.
5. Exercise representative prompts with more than one coding agent when routing or frontmatter descriptions change.
6. Run JSON parsing and `git diff --check` before submitting.

## Review checklist

- [ ] The change is specific to HoloScope or its compatible SDK/API surface.
- [ ] Current HoloScope product documentation and applicable Langfuse compatibility documentation were checked.
- [ ] Unsupported endpoints are not presented as available.
- [ ] No credentials, generated test data, or stale code samples are committed.
- [ ] Published behavior changes include the required plugin version bump.
- [ ] Verification evidence is included in the merge request.
