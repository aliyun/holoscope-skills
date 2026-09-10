# HoloScope Skill

An [Agent Skill](https://github.com/anthropics/skills) that teaches AI coding assistants how to work with Alibaba Cloud HoloScope, the Hologres service for agent observability and evaluation.

The skill covers HoloScope tracing, monitoring, datasets, experiments, evaluation, and user feedback. HoloScope exposes a tested subset of the Langfuse API, so the skill uses compatible Langfuse SDKs and CLI commands only where HoloScope supports them.

## Skill

| Skill | Description |
| ----- | ----------- |
| [holoscope](./skills/holoscope) | Connect applications and coding agents to HoloScope, inspect traces, manage datasets and scores, configure evaluations, and follow HoloScope-specific API constraints. |

## Installation

### Cursor Plugin

Install the HoloScope plugin:

```
/add-plugin holoscope
```

### skills CLI

```bash
npx skills add git@gitlab.alibaba-inc.com:kunwu.dy/holoscope-skills.git --skill "holoscope"
```

### Manual symlink

```bash
git clone git@gitlab.alibaba-inc.com:kunwu.dy/holoscope-skills.git /path/to/holoscope-skills
ln -s /path/to/holoscope-skills/skills/holoscope /path/to/skills-directory/holoscope
```

## Prerequisites

Create a key pair under **HoloScope服务 > Agent快速接入 > API Key管理** and copy the endpoint from **HoloScope服务 > 概览 > 连接管理**. The Secret Key is displayed only once; do not commit it.

```bash
export LANGFUSE_PUBLIC_KEY=pk-...
export LANGFUSE_SECRET_KEY=sk-...
export LANGFUSE_BASE_URL=<HoloScope endpoint>
export LANGFUSE_HOST="$LANGFUSE_BASE_URL"
```

The `LANGFUSE_*` names are required by the compatible SDK and CLI; this plugin contains only the HoloScope skill.

## Usage

The agent automatically invokes the skill for HoloScope tasks, including:

- Connecting an application or coding agent to HoloScope and auditing its traces
- Querying traces, observations, sessions, scores, and datasets
- Creating datasets and running evaluations
- Capturing user-feedback scores
- Upgrading compatible Langfuse SDK instrumentation used to report to HoloScope
- Looking up HoloScope product documentation and compatible SDK/API guidance

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
