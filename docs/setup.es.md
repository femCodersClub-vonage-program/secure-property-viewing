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

> Los pasos de macOS todavía no se han probado. Si usas Mac y algún paso falla o algún comando cambia, abre una issue Task del grupo `docs` con la corrección, para que a la siguiente persona no le pase lo mismo.

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

Abre `server/.env` y sustituye los siete valores de ejemplo:

| Variable | Valor |
| :---- | :---- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/peephole` |
| `DB_USERNAME` | `peephole` |
| `DB_PASSWORD` | La contraseña compartida del Drive |
| `LOAD_DEMO_DATA` | `true` para cargar los datos de ejemplo al arrancar el servidor, `false` para arrancar solo con las tablas |
| `SESSION_COOKIE_SECURE` | `false`, porque el servidor local funciona sobre `http://localhost`. Solo es `true` en Railway, donde la cookie de sesión de la agencia solo debe enviarse por HTTPS, como se decidió en el [ADR 0004](adr/0004-agency-sign-in.md). La cookie `XSRF-TOKEN` sigue el mismo valor |
| `API_DOCS_ENABLED` | `true` para abrir la documentación de la API en Swagger UI, en `http://localhost:8080/swagger-ui.html`, con el servidor arrancado. En Railway no se pone nunca, así que allí está apagada |
| `PHONE_HASH_SECRET` | Un valor aleatorio largo que generas tú (ver abajo). El servidor lo usa para hacer un hash de los teléfonos, así nunca se guardan tal cual |

Para generar el secreto del hash, en PowerShell:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

En macOS, usa `openssl rand -base64 32`. Copia el resultado directamente en `server/.env`, y nunca lo pegues en un asistente de IA.

El `PHONE_HASH_SECRET` de Railway es otro distinto, y está en la carpeta compartida del Drive del equipo.

Los datos de ejemplo son ficticios y están en `server/src/main/resources/db/seed/`. Solo se cargan cuando `LOAD_DEMO_DATA` es `true`, y las tablas se crean en los dos casos.

`DB_URL` apunta siempre a tu base de datos local, nunca a la de Railway, porque los tests escriben en la base a la que apunte. Un `DB_URL` definido en tu terminal, o inyectado por una herramienta como `railway run`, tiene prioridad sobre `.env`, así que la misma regla se aplica a él.

### Variables de Vonage

Cada API de Vonage funciona con la aplicación de Vonage de una persona del equipo, así que el servidor tiene un grupo de variables por API: el ID de la aplicación y su clave privada, y además el signature secret con el que Messages y Silent Authentication comprueban sus webhooks.

| Grupo | Variables | Valores en Railway |
| :---- | :---- | :---- |
| Verify | `VONAGE_VERIFY_APPLICATION_ID`, `VONAGE_VERIFY_PRIVATE_KEY` | Candé |
| Video | `VONAGE_VIDEO_APPLICATION_ID`, `VONAGE_VIDEO_PRIVATE_KEY` | Viviana |
| Messages | `VONAGE_MESSAGES_APPLICATION_ID`, `VONAGE_MESSAGES_PRIVATE_KEY`, `VONAGE_MESSAGES_SIGNATURE_SECRET` | Damaris |
| Silent Authentication | `VONAGE_SILENT_AUTH_APPLICATION_ID`, `VONAGE_SILENT_AUTH_PRIVATE_KEY`, `VONAGE_SILENT_AUTH_SIGNATURE_SECRET` | Mayleth |

En local, todas rellenan el grupo de Video, y el de Verify mientras Silent Authentication está apagado, porque el servidor no arranca sin ellos:

- **Verify:** tu propia aplicación de Vonage. Verify no necesita ninguna capacidad, así que sirve cualquiera de tus aplicaciones
- **Video:** la aplicación de Viviana, con los valores de la carpeta compartida del equipo en Drive, como decide la [spec de la videovisita](../specs/video-visit.md)

Todavía no hay código que lea el grupo de Messages: está reservado para la funcionalidad de mensajes (#87), así que déjalo con sus valores de ejemplo.

**Silent Authentication.** Está apagado mientras sus líneas sigan comentadas, como vienen en `.env.example`. Así la verificación del teléfono envía un código por SMS, como antes, y el webhook de estado de Verify rechaza todas las llamadas. Para probarlo, como describe la [spec de Silent Authentication](../specs/silent-authentication.md), quita el comentario de sus líneas, rellena su grupo con la aplicación de Mayleth del Drive, que tiene Network Registry en Test access, y pon:

| Variable | Valor |
| :---- | :---- |
| `SILENT_AUTH_ENABLED` | `true`. Así todas las verificaciones usan la aplicación de Silent Authentication, y el servidor no arranca sin su grupo |
| `SILENT_AUTH_VIRTUAL_OPERATOR` | `true` para aceptar los números de prueba `+990`, que responde el Virtual Operator de Vonage. Solo funciona junto con `SILENT_AUTH_ENABLED=true`. Solo mientras se prueba, nunca para visitantes reales |
| `SILENT_AUTH_REDIRECT_URL` | `http://localhost:5173/verification/return`, la página del cliente a la que vuelve la comprobación silenciosa |

En Railway, `SILENT_AUTH_REDIRECT_URL` es la misma ruta en el dominio público del cliente, y `SILENT_AUTH_VIRTUAL_OPERATOR` solo es `true` mientras el equipo prueba allí.

**El callback de estado de Verify.** Vonage avisa al servidor de cómo terminó una comprobación silenciosa con el webhook de estado, como describe la [spec de Silent Authentication](../specs/silent-authentication.md). En la aplicación de Mayleth, en el dashboard de Vonage, el callback de estado de Verify apunta a `/api/webhooks/verify/status` en el dominio público del servidor en Railway, y solo Mayleth lo cambia. En local, los callbacks no llegan a tu ordenador sin un túnel, y el flujo funciona igual: el cliente pide pasar al SMS, y Verify pasa al SMS por su cuenta a los 60 segundos. Nunca apuntes la aplicación compartida a tu propio túnel sin avisar al equipo, porque mientras tanto Railway deja de recibir los callbacks.

**La clave privada en base64.** Cada clave privada va en una sola línea, así el mismo valor funciona en `server/.env` y en Railway. Para copiar la tuya:

```bash
# macOS
base64 -i ruta/a/tu.key | tr -d '\n' | pbcopy
```

```powershell
# PowerShell de Windows
[Convert]::ToBase64String([IO.File]::ReadAllBytes("ruta\a\tu.key")) | Set-Clipboard
```

**Compartir tus credenciales.** Cada persona sube las suyas a la carpeta compartida del Drive del equipo: su API key, su API secret, el ID de su aplicación y el archivo de la clave privada (`.key`), y el signature secret si construye Messages. Nunca las envíes por Slack, en una issue, en el repositorio ni a un asistente de IA.

**En Railway.** Las mismas variables van en el servicio `server`, como se explica en [Railway desde la terminal](guides/railway.md).

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
| `Could not resolve placeholder 'app.flyway.locations.…'` | `LOAD_DEMO_DATA` en `server/.env` todavía tiene el valor de ejemplo de `.env.example` | Ponlo en `true` o `false` |
| `Failed to bind properties under 'server.servlet.session.cookie.secure'` | `SESSION_COOKIE_SECURE` en `server/.env` todavía tiene el valor de ejemplo de `.env.example` | Ponlo en `false` |
| `Invalid boolean value [true_or_false]` | `SILENT_AUTH_ENABLED` o `SILENT_AUTH_VIRTUAL_OPERATOR` en `server/.env` todavía tiene el valor de ejemplo `true_or_false`, de una copia antigua de `.env.example` o al quitar el comentario de sus líneas | Ponlo en `true` o `false` como en [Variables de Vonage](#variables-de-vonage), o vuelve a comentar las líneas de Silent Authentication para dejarlo apagado |
| `database "peephole" does not exist` | No se completó el paso 3 | Lanza el comando `createdb` del paso 3 |
| `npm error code EBADENGINE` en `client/` | Tu versión de Node.js es más antigua que la que necesita el proyecto | Instala una versión más nueva (paso 2) y vuelve a lanzar `npm ci` |
| `Connection refused` en el puerto `5432` | PostgreSQL no está arrancado | Windows: arranca el servicio `postgresql-x64-17`. macOS: `brew services start postgresql@17` |
| `PHONE_HASH_SECRET is not set`, `VONAGE_VERIFY_… is not set` o `VONAGE_VIDEO_… is not set` | Esa variable está vacía en `server/.env` | Rellénala: el secreto del hash como en el paso 4, el grupo de Verify con tu propia aplicación de Vonage y el de Video con los valores de Viviana del Drive, como en [Variables de Vonage](#variables-de-vonage) |
| `VONAGE_SILENT_AUTH_… is not set` o `SILENT_AUTH_REDIRECT_URL is not set` | `SILENT_AUTH_ENABLED` es `true` y esa variable está vacía en `server/.env` | Rellénala como en [Variables de Vonage](#variables-de-vonage), o pon `SILENT_AUTH_ENABLED=false` para volver a solo SMS |
| `VONAGE_VERIFY_PRIVATE_KEY does not match VONAGE_VERIFY_APPLICATION_ID`, o lo mismo con `VONAGE_VIDEO_…` o `VONAGE_SILENT_AUTH_…` | La clave y el ID son de aplicaciones distintas, o la clave no se copió entera | Vuelve a copiar las dos de la misma aplicación, con la clave en base64 en una sola línea |
| `VONAGE_VERIFY_APPLICATION_ID is not a valid application ID`, o lo mismo con `VONAGE_VIDEO_…` o `VONAGE_SILENT_AUTH_…` | El valor no es un Application ID, que tiene esta forma: `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` | Vuelve a copiarlo: el de Verify de tu aplicación en el dashboard de Vonage, y los de Video y Silent Authentication del Drive |
| `VONAGE_VERIFY_PRIVATE_KEY is not valid base64`, o lo mismo con `VONAGE_VIDEO_…` o `VONAGE_SILENT_AUTH_…` | La clave se pegó tal cual, o con espacios o saltos de línea | Vuelve a convertirla con el comando de [Variables de Vonage](#variables-de-vonage) y pega la línea entera |
