# Team skills

A skill is a step-by-step procedure that an AI assistant loads when the task calls for it, such as writing an integration test or adding a Flyway migration. Agents in `.claude/agents/` review work; skills help you do it.

## When a skill is worth writing

- You have done the task at least once in this project, and you know the steps that work
- The steps are more than what `AGENTS.md` already says. A skill explains *how*, in order; it never repeats the rules, it links to them
- Someone else on the team will need to do the same task

If one of these is missing, a short note in an issue or a guide in `docs/guides/` is probably enough.

## Format

Each skill lives in its own folder, named in English and in kebab-case, with a `SKILL.md` file inside:

```text
.claude/skills/
└── server-integration-test/
    └── SKILL.md
```

`SKILL.md` starts with a short header and then the steps:

```markdown
---
name: server-integration-test
description: Write a server integration test against the real PostgreSQL database. Use when adding a test for an endpoint or a repository.
---

1. ...
2. ...
```

- `name` matches the folder name
- `description` says what the skill does and when to use it, because the assistant reads it to decide whether to load the skill
- The steps are short and concrete, with the commands and file paths of this project, and links to the rules in `AGENTS.md`, `client/AGENTS.md` or `server/AGENTS.md`
- Written in English, like the rest of the repository

## Which assistants load them

Claude Code loads the skills in this folder. Whether GitHub Copilot loads them, in VS Code and in IntelliJ, has not been checked yet. Until it is, if you use Copilot, ask it to read the skill's `SKILL.md` before starting the task.

## Adding a skill

A new skill goes through a pull request like any other change, so the team can review that the steps work.
