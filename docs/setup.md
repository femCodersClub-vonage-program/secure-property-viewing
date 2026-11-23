# Local setup

🇪🇸 [Leer en español](setup.es.md)

Everything you need to run Peephole on your own computer, step by step. Docker is not needed.

Everyone uses the same PostgreSQL version, the same database name, the same database user and the same password for that user, so the project behaves the same on every machine. The tables are created by the Flyway migrations in `server/`, never by hand.

## 1. Prerequisites

| Tool | Version | Check it with |
| :---- | :---- | :---- |
| Git | Any recent version | `git --version` |
| Java (JDK) | 21 | `java -version` |
| Node.js | 22.22.2 or later | `node --version` |
| PostgreSQL | 17 (any 17.x) | `psql --version` |

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
- Choose your own password for the `postgres` superuser and keep it somewhere safe: you need it in step 3. This one is personal, not shared
- Skip Stack Builder at the end

The installer does not add PostgreSQL to your `PATH`. Add it with this command, then open a new terminal:

```powershell
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path","User") + ";C:\Program Files\PostgreSQL\17\bin", "User")
```

### macOS (Homebrew)

> The macOS steps have not been tested yet. If you use a Mac and a step fails or a command changes, open a Task issue in the `docs` group with the correction, so the next person does not run into the same problem.

```bash
brew install --cask temurin@21
brew install node
brew install postgresql@17
brew services start postgresql@17
echo 'export PATH="$(brew --prefix postgresql@17)/bin:$PATH"' >> ~/.zshrc
```

Open a new terminal afterwards. On macOS the PostgreSQL superuser is your own macOS user, not `postgres`, so leave out `-U postgres` in the next step.

## 3. Create the database

Create the `peephole` user and the `peephole` database it owns.

The password for the `peephole` user is the same for the whole team and is kept in the team's shared Drive folder, which the tech lead shares with you. It is never written in the repository.

```bash
createuser -U postgres --pwprompt peephole
createdb -U postgres --owner peephole peephole
```

The first command asks twice for the new user's password: type the shared one from the Drive folder. Then it may ask for your own `postgres` password from step 2.

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

Open `server/.env` and replace the seven placeholders:

| Variable | Value |
| :---- | :---- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/peephole` |
| `DB_USERNAME` | `peephole` |
| `DB_PASSWORD` | The shared password from the Drive folder |
| `LOAD_DEMO_DATA` | `true` to load the demo data when the server starts, `false` to start with the tables only |
| `SESSION_COOKIE_SECURE` | `false`, because the local server runs over `http://localhost`. It is `true` only on Railway, where the agency session cookie must be sent over HTTPS only, as decided in [ADR 0004](adr/0004-agency-sign-in.md). The `XSRF-TOKEN` cookie follows the same flag |
| `API_DOCS_ENABLED` | `true` to open the API documentation in Swagger UI at `http://localhost:8080/swagger-ui.html` while the server runs. It is never set on Railway, so the documentation stays off there |
| `PHONE_HASH_SECRET` | A long random value you generate yourself (see below). The server uses it to hash phone numbers, so they are never stored as they are |

To generate the hash secret, in PowerShell:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

On macOS, use `openssl rand -base64 32`. Copy the result straight into `server/.env`, and never paste it into an AI assistant.

The `PHONE_HASH_SECRET` on Railway is a different one, kept in the team's shared Drive folder.

The demo data is fictional and lives in `server/src/main/resources/db/seed/`. It is only loaded when `LOAD_DEMO_DATA` is `true`, and the tables are created either way.

`DB_URL` always points to your local database, never to the one on Railway, because the tests write to whatever database it points to. A `DB_URL` set in your terminal, or injected by a tool such as `railway run`, takes precedence over `.env`, so the same rule applies to it.

### Vonage variables

Each Vonage API runs on the Vonage application of one person on the team, so the server has one group of variables per API: the application ID and its private key, plus the signature secret that Messages and Silent Authentication use to verify their webhooks.

| Group | Variables | Values on Railway |
| :---- | :---- | :---- |
| Verify | `VONAGE_VERIFY_APPLICATION_ID`, `VONAGE_VERIFY_PRIVATE_KEY` | Candé |
| Video | `VONAGE_VIDEO_APPLICATION_ID`, `VONAGE_VIDEO_PRIVATE_KEY` | Viviana |
| Messages | `VONAGE_MESSAGES_APPLICATION_ID`, `VONAGE_MESSAGES_PRIVATE_KEY`, `VONAGE_MESSAGES_SIGNATURE_SECRET` | Damaris |
| Silent Authentication | `VONAGE_SILENT_AUTH_APPLICATION_ID`, `VONAGE_SILENT_AUTH_PRIVATE_KEY`, `VONAGE_SILENT_AUTH_SIGNATURE_SECRET` | Mayleth |

Locally, everyone fills in the Verify and Video groups, because the server does not start without them:

- **Verify:** your own Vonage application. Verify needs no capability, so any of your applications works
- **Video:** Viviana's application, with the values from the team's shared Drive folder, as the [video visit spec](../specs/video-visit.md) decides

Fill in the Messages group only if it is yours, and leave it with its placeholders otherwise.

**Silent Authentication.** Set `SILENT_AUTH_ENABLED` and `SILENT_AUTH_VIRTUAL_OPERATOR` to `false` to keep it off. Phone verification then sends an SMS code, as before, and the rest of its variables can keep their placeholders. To try it, as the [Silent Authentication spec](../specs/silent-authentication.md) describes, fill in its group with Mayleth's application from the Drive folder, which has Network Registry in Test access, and set:

| Variable | Value |
| :---- | :---- |
| `SILENT_AUTH_ENABLED` | `true`. Every verification then uses the Silent Authentication application, and the server does not start without its group |
| `SILENT_AUTH_VIRTUAL_OPERATOR` | `true` to accept the `+990` test numbers that Vonage's Virtual Operator answers for. Only while testing, never for real visitors |
| `SILENT_AUTH_REDIRECT_URL` | `http://localhost:5173/verification/return`, the client page the silent check comes back to |

On Railway, `SILENT_AUTH_REDIRECT_URL` is the same route on the client's public domain, and `SILENT_AUTH_VIRTUAL_OPERATOR` is `true` only while the team tests there.

**The private key in base64.** Each private key goes on a single line, so the same value works in `server/.env` and on Railway. To copy yours:

```bash
# macOS
base64 -i path/to/your.key | tr -d '\n' | pbcopy
```

```powershell
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\your.key")) | Set-Clipboard
```

**Sharing your credentials.** Each person uploads hers to the team's shared Drive folder: her API key, API secret, application ID and private key file (`.key`), plus the signature secret if she builds Messages. Never send them through Slack, an issue, the repository or an AI assistant.

**On Railway.** The same variables go in the `server` service, as described in [Railway from the terminal](guides/railway.md) (in Spanish).

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
| `'url' must start with "jdbc"` | `server/.env` still has the placeholders from `.env.example` | Replace them with the values from step 4 |
| `The server requested SCRAM-based authentication, but no password was provided` | `DB_PASSWORD` in `server/.env` is empty | Set it to the shared password, with no quotes or spaces |
| `password authentication failed for user "peephole"` | `DB_PASSWORD` in `server/.env` does not match the password of the `peephole` user | Check that both are the shared password from the Drive folder |
| `Could not resolve placeholder 'app.flyway.locations.…'` | `LOAD_DEMO_DATA` in `server/.env` still has the placeholder from `.env.example` | Set it to `true` or `false` |
| `Failed to bind properties under 'server.servlet.session.cookie.secure'` | `SESSION_COOKIE_SECURE` in `server/.env` still has the placeholder from `.env.example` | Set it to `false` |
| `Invalid boolean value [true_or_false]` | `SILENT_AUTH_ENABLED` or `SILENT_AUTH_VIRTUAL_OPERATOR` in `server/.env` still has the placeholder from `.env.example` | Set it to `false`, or to `true` to try Silent Authentication as in [Vonage variables](#vonage-variables) |
| `database "peephole" does not exist` | Step 3 was not completed | Run the `createdb` command from step 3 |
| `npm error code EBADENGINE` in `client/` | Your Node.js version is older than the one the project needs | Install a newer version (step 2) and run `npm ci` again |
| `Connection refused` on port `5432` | PostgreSQL is not running | Windows: start the `postgresql-x64-17` service. macOS: `brew services start postgresql@17` |
| `PHONE_HASH_SECRET is not set`, `VONAGE_VERIFY_… is not set` or `VONAGE_VIDEO_… is not set` | That variable is empty in `server/.env` | Fill it in: the hash secret as in step 4, the Verify group with your own Vonage application and the Video group with Viviana's values from the Drive folder, as in [Vonage variables](#vonage-variables) |
| `VONAGE_SILENT_AUTH_… is not set` or `SILENT_AUTH_REDIRECT_URL is not set` | `SILENT_AUTH_ENABLED` is `true` and that variable is empty in `server/.env` | Fill it in as in [Vonage variables](#vonage-variables), or set `SILENT_AUTH_ENABLED=false` to go back to SMS only |
| `VONAGE_VERIFY_PRIVATE_KEY does not match VONAGE_VERIFY_APPLICATION_ID`, or the same for `VONAGE_VIDEO_…` | The key and the ID come from different applications, or the key was not copied whole | Copy both again from the same application, with the key in base64 on a single line |
| `VONAGE_VERIFY_APPLICATION_ID is not a valid application ID`, or the same for `VONAGE_VIDEO_…` | The value is not an application ID, which looks like `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` | Copy it again: Verify from your application in the Vonage dashboard, Video from the Drive folder |
| `VONAGE_VERIFY_PRIVATE_KEY is not valid base64`, or the same for `VONAGE_VIDEO_…` | The key was pasted as it is, or with spaces or line breaks | Convert it again with the command in [Vonage variables](#vonage-variables) and paste the single line |
