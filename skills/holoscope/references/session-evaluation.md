---
name: holoscope-session-evaluation
description: Configure and validate deployment-specific HoloScope automatic Session evaluation through public project-key rule APIs, including bounded two-turn scoring and readback.
metadata:
  required_access:
    - HOLOSCOPE_PROJECT_INTERFACE
---

# Configure and verify Session evaluation

Configure `target=session` through the public evaluation-rule APIs with project API keys. Rule creation, activation, two-turn LLM scoring, and same-rule score replacement were verified in pre-release; check support on the target deployment before enabling a rule. Read the [public API documentation](https://help.aliyun.com/zh/hologres/user-guide/holoscope-service-api-list) for shared evaluator and rule fields.

## Establish scope and the deployed contract

1. Check the target's public or deployment-provided rule contract. Session rules use `llm_as_judge`.
2. Obtain explicit authorization for isolated resources, services, test turns, sampling, maximum model-call budget, deadlines, and stop conditions. Evaluator creation and rule activation can invoke model prechecks. Inspect existing wildcard rules before ingestion so their judge calls are included in the budget; do not alter them to make a probe succeed.
3. Reuse an approved LLM evaluator or create a separate trial family. Never move production rules to a new evaluator version for a probe. If access or required configuration is missing, provide a validation draft and report the blocked calls.

## Tested public request contract

Create through `POST /api/public/unstable/evaluation-rules`; replace placeholders and preview the exact scope before writing:

```json
{"name":"<unique-rule>","evaluator":{"name":"<approved-family>","scope":"project","type":"llm_as_judge"},"target":"session","enabled":false,"sampling":1,"serviceNames":["<isolated-service>"],"filter":[],"mapping":[{"variable":"input","source":"conversation"}],"sessionIdleTimeoutSeconds":1}
```

Use the evaluator's actual `scope` (`project` or `managed`). Each mapping `variable` must match a prompt variable exactly once and cover all variables; source is `conversation` or `metadata`, with optional `jsonPath` starting with `$`. The example assumes a prompt containing `{{input}}`. `sessionIdleTimeoutSeconds` is an integer from 1 to 86400, default 300. Session filters support entry-turn `environment` and `userId`; select explicit service names rather than `*` or an empty selection. A Session is judged as one complete conversation, not an average of per-turn scores.

## Run bounded validation

1. Create one disabled rule and read back its ID, evaluator, target, mappings, service names, idle configuration, and effective status using `GET /api/public/unstable/evaluation-rules/{id}`. A saved rule does not prove scoring works.
2. Activate only that rule with `PATCH /api/public/unstable/evaluation-rules/{id}` and `{"enabled":true}`; read back `enabled` and `status`. Submit one completed turn with a unique Session ID after activation through supported ingestion. Use a business test environment rather than an internal `langfuse-` environment, non-null input/output, the selected service name, and an end time for a non-event native root span. Respect the idle window and a bounded polling deadline.
3. Read `GET /api/public/v3/scores?sessionId=<encoded-id>&fields=details,subject` with cursor pagination. Verify `source=EVAL`, the Session subject, metric type/value, non-empty `comment`, and metadata `session_eval_rule_id`, `session_eval_input_version`, `session_eval_execution_id`. An unrelated or manually uploaded score does not satisfy the check.
4. Submit a second approved turn and verify reevaluation through the same readback. Record both input versions, execution IDs, score IDs, reasons, and associations. The same-rule score was replaced after the second successful evaluation in the tested pre-release deployment; verify this behavior and preservation of unrelated scores on the selected target.
5. Stop at the approved deadline rather than replaying traffic until success. Disable the test rule with `{"enabled":false}` and verify its state; delete only exact approved disposable resources. Never delete source traces to undo scores.

Only after rule creation, activation, score readback, and reevaluation pass may the report mark automatic Session evaluation verified for that deployment. Expansion and rule-state changes require approved scope and budget.

## Diagnose and report

- Keep HTTP/auth/request errors separate from model failures and missing or delayed scores. Preserve failed attempts and stop at the agreed deadline.
- Diagnose with the public rule status and score readback. Use Console UI or support when additional investigation is needed.
- Report the contract checked, actual deployment version if available, authorized scope, rule/evaluator IDs, requested/completed/scored counts, both input versions, each check's status, and residual uncertainty.
