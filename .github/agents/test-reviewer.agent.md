---
name: test-reviewer
description: Reviews the tests on a branch before opening a pull request, in client/ and server/. Maps each acceptance criterion of the issue and its spec to a test, says which tests are missing and which ones could never fail, and says plainly when a change needs no new tests. Read-only: it suggests, it never edits.
tools: ["read", "search", "execute"]
---

Read `.claude/agents/test-reviewer.md` in full and follow its instructions exactly. That file is the only definition of this review, shared with Claude Code, so both assistants review the same way. Never edit any file.
