# Comandos del día a día

Los comandos que vas a usar a diario para arrancar el proyecto, trabajar con Git y consultar la base de datos, todos desde la terminal de VS Code.

Si es la primera vez que pones en marcha el proyecto, empieza por [`docs/setup.es.md`](../setup.es.md).

Los comandos están pensados para **PowerShell en Windows**. En macOS, usa `./mvnw` en lugar de `.\mvnw.cmd` y quita `-U postgres` de los comandos de PostgreSQL.

## Abrir terminales en VS Code

Lo normal es tener dos terminales abiertas a la vez, una para el servidor y otra para el cliente:

- Menú **Terminal → Nuevo terminal** para abrir una
- El icono de **dividir terminal**, en la esquina de la terminal, para tener dos lado a lado
- Cada terminal empieza en la raíz del proyecto: entra en la carpeta que necesites con `cd server` o `cd client`

Para parar lo que esté corriendo en una terminal, pulsa `Ctrl+C`.

## Empezar el día

Desde la raíz del proyecto, trae lo último de `dev`:

```powershell
git switch dev
git pull
```

Después de un `pull`, según lo que haya cambiado:

| Si ha cambiado… | Haz esto |
| :---- | :---- |
| `client/package-lock.json` | `npm ci` en `client/` |
| Algo en `server/` | Nada: Maven descarga lo que falte al arrancar |
| Migraciones nuevas en `server/src/main/resources/db/migration/` | Nada: Flyway las aplica al arrancar el servidor |
| `server/.env.example` | Revisa si hay variables nuevas y añádelas a tu `server/.env` con los valores de [`docs/setup.es.md`](../setup.es.md) |

## Servidor (`server/`)

```powershell
cd server
```

| Para… | Comando |
| :---- | :---- |
| Arrancar el servidor en `http://localhost:8080` | `.\mvnw.cmd spring-boot:run` |
| Compilar y pasar todos los tests | `.\mvnw.cmd verify` |
| Pasar solo los tests | `.\mvnw.cmd test` |
| Pasar una sola clase de test | `.\mvnw.cmd test "-Dtest=ServerApplicationTests"` |
| Borrar lo compilado y empezar de cero | `.\mvnw.cmd clean` |

En PowerShell, los argumentos que empiezan por `-D` van entre comillas, como en el ejemplo de la clase de test.

## Cliente (`client/`)

```powershell
cd client
```

| Para… | Comando |
| :---- | :---- |
| Instalar las dependencias exactas del proyecto | `npm ci` |
| Arrancar el cliente en `http://localhost:5173` | `npm run dev` |
| Pasar el linter | `npm run lint` |
| Comprobar los tipos y compilar | `npm run build` |
| Ver la versión compilada | `npm run preview` |

Mientras `npm run dev` está corriendo, los cambios que guardas se ven en el navegador sin recargar.

## Base de datos desde la terminal

Conéctate a tu base local con `psql`. Te pedirá la contraseña compartida del usuario `peephole`, la de la carpeta del Drive del equipo:

```powershell
psql -U peephole -d peephole
```

Ya dentro, el cursor cambia a `peephole=>`. Estos son los comandos más útiles:

| Para… | Escribe |
| :---- | :---- |
| Ver todas las tablas | `\dt` |
| Ver las columnas de una tabla | `\d visits` |
| Ver qué migraciones se han aplicado | `SELECT version, description, success FROM flyway_schema_history;` |
| Consultar datos | `SELECT * FROM visits LIMIT 10;` |
| Ver la ayuda de los comandos | `\?` |
| Salir | `\q` |

- Las consultas SQL terminan en punto y coma (`;`). Si olvidas ponerlo, `psql` espera a que lo escribas en la línea siguiente
- Si un resultado es largo y la terminal se queda en pausa, pulsa `q` para volver
- Para una consulta rápida sin entrar en `psql`: `psql -U peephole -d peephole -c "\dt"`

Puedes consultar y probar datos en tu base local, pero **no cambies la estructura de las tablas a mano**: eso solo se hace con migraciones. Si tu base local se ha quedado en mal estado, mira cómo [resetearla](flyway-migrations.md#resetear-tu-base-de-datos-local).

## Trabajar en una tarea

Crea tu rama desde `dev`, con un nombre en inglés:

```powershell
git switch dev
git pull
git switch -c feature/otp-verification
```

Para traer a tu rama lo último de `dev` mientras trabajas:

```powershell
git fetch origin
git merge origin/dev
```

Antes de abrir la pull request, comprueba lo mismo que comprobará el CI:

```powershell
cd server
.\mvnw.cmd verify
cd ..\client
npm run lint
npm run build
```

Después, pasa el agente de revisión de documentación pidiéndoselo a Claude Code: «revisa mi rama con el agente docs-reviewer».

## Si algo no va

| Qué ves | Cómo salir |
| :---- | :---- |
| `Port 8080 was already in use` | Ya tienes otro servidor arrancado. Busca la terminal donde corre y páralo con `Ctrl+C`. Si no lo encuentras: `Get-NetTCPConnection -LocalPort 8080 \| Select-Object OwningProcess` y después `Stop-Process -Id <número>` |
| `Port 5173 is in use` | Vite arranca en el siguiente puerto libre: usa la dirección que aparece en la terminal |
| Un error de Flyway al arrancar el servidor | Mira la tabla de errores de [la guía de Flyway](flyway-migrations.md#si-algo-falla) |
| Un error de base de datos o de `.env` | Mira los problemas frecuentes de [`docs/setup.es.md`](../setup.es.md#problemas-frecuentes) |
| `psql` avisa de que la página de códigos de la consola es distinta | Puedes ignorarlo. Si ves mal las tildes, escribe `chcp 1252` antes de abrir `psql` |
