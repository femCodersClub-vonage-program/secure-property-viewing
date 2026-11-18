---
name: sync-branch-with-dev
description: Update a working branch with the latest changes from dev and get it back to a passing build, including merge conflicts, stale build output and new environment variables. Use before opening a pull request, when GitHub says the branch has conflicts, or when dev has moved on while you work.
---

The everyday commands are in [`docs/guides/daily-commands.md`](../../../docs/guides/daily-commands.md) and the branch rules in [`CONTRIBUTING.md`](../../../CONTRIBUTING.md#branches). This skill covers the whole sequence, and what to do when it does not go cleanly. On Windows, use `.\mvnw.cmd` instead of `./mvnw`.

1. **Save your work first.** Run `git status`. Format and commit everything that belongs to the branch, as the root [`AGENTS.md`](../../../AGENTS.md) says. Never merge with uncommitted changes, and never discard changes you did not make.

2. **Bring `dev` in** with a merge, not a rebase: the branch is already pushed and may have review comments, and a rebase would rewrite its history.

   ```bash
   git fetch origin
   git merge origin/dev --no-edit
   ```

   `--no-edit` keeps the default merge message, so no editor opens. If Vim opens anyway, press Esc, type `:wq` and press Enter.

3. **If git reports `CONFLICT`**, list the files with `git status` and, for each one, read both sides before choosing:
  - Most of the time both changes are wanted, such as two paragraphs added at the same place in a doc. Keep both
  - Take one side whole only when the other is obsolete. In IntelliJ's merge dialog, *Accept Left* and *Accept Right* replace the whole file: use them only then, and add back by hand anything the other side needs
  - Remove every `<<<<<<<`, `=======` and `>>>>>>>` line, then `git add` the file by name and finish with `git commit --no-edit`
  - To give up and start again, run `git merge --abort`

4. **Check what the merge brought**, because git can join both sides without a conflict and still leave the code broken, such as a new use of something `dev` removed:

   ```bash
   git --no-pager diff ORIG_HEAD HEAD --stat
   ```

  - **New variables in `server/.env.example`:** add them to your own `server/.env` as [`docs/setup.md`](../../../docs/setup.md) explains, or the server will not start. Never paste their values into an AI assistant
  - **A new migration in `dev`:** if your branch also adds one and it is now older than the newest in `dev`, rename it with the current date and time in UTC, as [`CONTRIBUTING.md`](../../../CONTRIBUTING.md#database-migrations) says
  - **`client/package-lock.json` changed:** run `npm ci` in `client/`

5. **Build from scratch, with the same checks as the CI.** The server tests need your local PostgreSQL running and `server/.env` filled in, as [`docs/setup.md`](../../../docs/setup.md) explains. The `clean` matters: `target/` may still hold classes compiled on another branch, and a `NoClassDefFoundError` that names a class you never touched usually means exactly that.

   ```bash
   cd server
   ./mvnw spotless:check
   ./mvnw clean verify
   cd ../client
   npm run lint
   npm run format:check
   npm run images:check
   npm test
   npm run build
   ```

   Run the `client/` checks only if `client/` changed on either side. If a format check fails on a file you fixed during a conflict, run `./mvnw spotless:apply` in `server/` or `npm run format` in `client/`, and commit the result before pushing.

6. **Push** with `git push`. If the pull request was already approved, the new commits dismiss that approval, as [`CONTRIBUTING.md`](../../../CONTRIBUTING.md#pull-requests-and-review) says. Leave a comment saying that you merged `dev` and how you resolved each conflict, and request the review again.
