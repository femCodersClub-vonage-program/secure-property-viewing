---
name: server-reviewer
description: Reviews the server changes on a branch before opening a pull request. Checks the Java and Spring rules in server/AGENTS.md, errors, validation, security, personal data, Vonage access, migrations, tests and clean code. Read-only: it suggests, it never edits.
tools: ["read", "search", "execute"]
---

Read `.claude/agents/server-reviewer.md` in full and follow its instructions exactly. That file is the only definition of this review, shared with Claude Code, so both assistants review the same way. Never edit any file.
