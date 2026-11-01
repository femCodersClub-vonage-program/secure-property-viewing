# Puesta en marcha en local

🇬🇧 [Read in English](setup.md)

Todo lo que necesitas para arrancar Peephole en tu ordenador, paso a paso. No hace falta Docker.

Todas usamos la misma versión de PostgreSQL, el mismo nombre de base de datos, el mismo usuario y la misma contraseña para ese usuario, así el proyecto se comporta igual en todos los ordenadores. Las tablas las crean las migraciones de Flyway de `server/`, nunca se crean a mano.

## 1. Requisitos

| Herramienta | Versión | Cómo comprobarla |
| :---- | :---- | :---- |
| Git | Cualquier versión reciente | `git --version` |
| Java (JDK) | 21 | `java -version` |
| Node.js | 22.22.2 o superior | `node --version` |
| PostgreSQL | 17 (cualquier 17.x) | `psql --version` |

Si los cuatro comandos muestran la versión correcta, salta al [paso 3](#3-crear-la-base-de-datos).

## 2. Instalar lo que falte

Abre una terminal nueva después de cada instalación para que reconozca los comandos nuevos.

### Windows (PowerShell)

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
winget install OpenJS.NodeJS.LTS
winget install PostgreSQL.PostgreSQL.17 --interactive
```

El instalador de PostgreSQL abre un asistente:

- Deja el puerto `5432`
- Elige tu propia contraseña para el superusuario `postgres` y guárdala bien: la necesitas en el paso 3. Esta es personal, no se comparte
- Al final, salta Stack Builder

El instalador no añade PostgreSQL al `PATH`. Añádelo con este comando y abre una terminal nueva:

```powershell
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path","User") + ";C:\Program Files\PostgreSQL\17\bin", "User")
```

### macOS (Homebrew)

> Los pasos de macOS todavía no se han probado. Si usas Mac y algún paso falla o algún comando cambia, corrígelo en esta guía y en `setup.md` en tu próxima pull request, para que a la siguiente persona no le pase lo mismo.

```bash
brew install --cask temurin@21
brew install node
brew install postgresql@17
brew services start postgresql@17
echo 'export PATH="$(brew --prefix postgresql@17)/bin:$PATH"' >> ~/.zshrc
```

Después, abre una terminal nueva. En macOS el superusuario de PostgreSQL es tu propio usuario de macOS, no `postgres`, así que en el paso siguiente quita `-U postgres` de los comandos.

## 3. Crear la base de datos

Crea el usuario `peephole` y la base de datos `peephole`, que será suya.

La contraseña del usuario `peephole` es la misma para todo el equipo y está en la carpeta compartida del Drive del equipo, que te comparte la tech lead. Nunca se escribe en el repositorio.

```bash
createuser -U postgres --pwprompt peephole
createdb -U postgres --owner peephole peephole
```

El primer comando te pide dos veces la contraseña del usuario nuevo: escribe la compartida del Drive. Después puede pedirte tu contraseña personal de `postgres` del paso 2.

Comprueba que puedes conectarte con el usuario nuevo:

```bash
psql -U peephole -d peephole -c "select version();"
```

Tiene que aparecer `PostgreSQL 17`.

## 4. Configurar el servidor

El servidor lee sus secretos de `server/.env`, que nunca se sube al repositorio. Créalo a partir de la plantilla:

```bash
cd server
cp .env.example .env
```

En PowerShell de Windows, usa `copy` en lugar de `cp`.

Abre `server/.env` y sustituye los tres valores de ejemplo:

| Variable | Valor |
| :---- | :---- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/peephole` |
| `DB_USERNAME` | `peephole` |
| `DB_PASSWORD` | La contraseña compartida del Drive |

## 5. Arrancar el servidor

Desde `server/`, compílalo y pasa los tests:

```bash
./mvnw verify
```

En Windows, usa `.\mvnw.cmd` en lugar de `./mvnw`. La primera vez tarda unos minutos porque Maven descarga sus dependencias.

Arráncalo:

```bash
./mvnw spring-boot:run
```

Funciona en `http://localhost:8080`. Para pararlo, pulsa `Ctrl+C`.

## 6. Arrancar el cliente

Desde `client/`, instala las versiones exactas de las dependencias que fija `package-lock.json` y arranca el servidor de desarrollo:

```bash
cd client
npm ci
npm run dev
```

Abre `http://localhost:5173`. Para pararlo, pulsa `Ctrl+C`.

## Problemas frecuentes

| Qué ves | Por qué pasa | Cómo se arregla |
| :---- | :---- | :---- |
| No se reconoce `psql`, `createuser` o `createdb` | PostgreSQL no está en el `PATH` | Repite el paso del `PATH` de tu sistema y abre una terminal nueva |
| `Could not resolve placeholder 'DB_URL'` | Falta `server/.env` o has arrancado el servidor desde otra carpeta | Crea `server/.env` (paso 4) y lanza los comandos desde `server/` |
| `'url' must start with "jdbc"` | `server/.env` todavía tiene los valores de ejemplo de `.env.example` | Sustitúyelos por los del paso 4 |
| `The server requested SCRAM-based authentication, but no password was provided` | `DB_PASSWORD` está vacío en `server/.env` | Pon la contraseña compartida, sin comillas ni espacios |
| `password authentication failed for user "peephole"` | `DB_PASSWORD` de `server/.env` no coincide con la contraseña del usuario `peephole` | Comprueba que las dos son la contraseña compartida del Drive |
| `database "peephole" does not exist` | No se completó el paso 3 | Lanza el comando `createdb` del paso 3 |
| `npm error code EBADENGINE` en `client/` | Tu versión de Node.js es más antigua que la que necesita el proyecto | Instala una versión más nueva (paso 2) y vuelve a lanzar `npm ci` |
| `Connection refused` en el puerto `5432` | PostgreSQL no está arrancado | Windows: arranca el servicio `postgresql-x64-17`. macOS: `brew services start postgresql@17` |
