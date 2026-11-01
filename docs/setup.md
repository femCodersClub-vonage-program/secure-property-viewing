# Local setup

Everything you need to run Peephole on your own computer, step by step. Docker is not needed.

Everyone uses the same PostgreSQL version, the same database name and the same database user, so the project behaves the same on every machine. The tables are created by the Flyway migrations in `server/`, never by hand.

## 1. Prerequisites

| Tool | Version | Check it with |
| :---- | :---- | :---- |
| Git | Any recent version | `git --version` |
| Java (JDK) | 21 | `java -version` |
| Node.js | 22.12 or later | `node --version` |
| PostgreSQL | 17 | `psql --version` |

If all four commands print the right version, skip to [step 3](#3-create-the-database).

## 2. Install what is missing

Open a new terminal after each installation so it picks up the new commands.

### Windows (PowerShell)

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
winget install OpenJS.NodeJS.LTS
winget install PostgreSQL.PostgreSQL.17 --interactive
```

The PostgreSQL installer opens a wizard:

- Keep port `5432`
- Choose a password for the `postgres` superuser and keep it somewhere safe: you need it in step 3
- Skip Stack Builder at the end

The installer does not add PostgreSQL to your `PATH`. Add it with this command, then open a new terminal:

```powershell
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path","User") + ";C:\Program Files\PostgreSQL\17\bin", "User")
```

### macOS (Homebrew)

```bash
brew install --cask temurin@21
brew install node
brew install postgresql@17
brew services start postgresql@17
echo 'export PATH="$(brew --prefix postgresql@17)/bin:$PATH"' >> ~/.zshrc
```

Open a new terminal afterwards. On macOS the PostgreSQL superuser is your own macOS user, not `postgres`, so leave out `-U postgres` in the next step.

## 3. Create the database

Create the `peephole` user and the `peephole` database it owns. The first command asks you to choose a password for the `peephole` user; it may then ask for the `postgres` password from step 2.

```bash
createuser -U postgres --pwprompt peephole
createdb -U postgres --owner peephole peephole
```

Check that you can connect as the new user:

```bash
psql -U peephole -d peephole -c "select version();"
```

It should print `PostgreSQL 17`.

## 4. Configure the server

The server reads its secrets from `server/.env`, which is never committed. Create it from the template:

```bash
cd server
cp .env.example .env
```

On Windows PowerShell, use `copy` instead of `cp`.

Open `server/.env` and replace the three placeholders:

| Variable | Value |
| :---- | :---- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/peephole` |
| `DB_USERNAME` | `peephole` |
| `DB_PASSWORD` | The password you chose for the `peephole` user in step 3 |

## 5. Run the server

From `server/`, build it and run the tests:

```bash
./mvnw verify
```

On Windows, use `.\mvnw.cmd` instead of `./mvnw`. The first run takes a few minutes because Maven downloads its dependencies.

Start it:

```bash
./mvnw spring-boot:run
```

It runs on `http://localhost:8080`. Stop it with `Ctrl+C`.

## 6. Run the client

From `client/`, install the exact dependency versions from `package-lock.json` and start the development server:

```bash
cd client
npm ci
npm run dev
```

Open `http://localhost:5173`. Stop it with `Ctrl+C`.

## Troubleshooting

| What you see | Cause | Fix |
| :---- | :---- | :---- |
| `psql`, `createuser` or `createdb` is not recognized | PostgreSQL is not in your `PATH` | Repeat the `PATH` step for your system and open a new terminal |
| `Could not resolve placeholder 'DB_URL'` | `server/.env` is missing or you ran the server from another folder | Create `server/.env` (step 4) and run the commands from `server/` |
| `The server requested SCRAM-based authentication, but no password was provided` | `DB_PASSWORD` in `server/.env` is empty | Set it to the password from step 3, with no quotes or spaces |
| `password authentication failed for user "peephole"` | `DB_PASSWORD` in `server/.env` does not match the password from step 3 | Fix the value in `server/.env` |
| `database "peephole" does not exist` | Step 3 was not completed | Run the `createdb` command from step 3 |
| `Connection refused` on port `5432` | PostgreSQL is not running | Windows: start the `postgresql-x64-17` service. macOS: `brew services start postgresql@17` |
