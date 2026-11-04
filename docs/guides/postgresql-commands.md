# Comandos de PostgreSQL

Todos los comandos para crear y consultar nuestra base de datos desde la terminal de VS Code, reunidos en un solo sitio.

Están pensados para **PowerShell en Windows**. En macOS, quita `-U postgres` de los comandos. Si es la primera vez que pones en marcha el proyecto, sigue antes [`docs/setup.es.md`](../setup.es.md).

## Tus datos están en `server/.env`

Si no recuerdas los datos de conexión, ábrelos en VS Code desde tu archivo `server/.env`:

| Variable | Qué es |
| :---- | :---- |
| `DB_URL` | La dirección de tu base de datos local |
| `DB_USERNAME` | El usuario, `peephole` |
| `DB_PASSWORD` | La contraseña compartida del usuario `peephole` |

Ese archivo es solo tuyo: nunca se sube al repositorio ni se pega en un asistente de IA. Si todavía no lo tienes, créalo con el [paso 4 de la puesta en marcha](../setup.es.md#4-configurar-el-servidor).

Los comandos te piden una de estas dos contraseñas, según el usuario que lleven:

| Si el comando lleva… | Te pide… | Dónde está |
| :---- | :---- | :---- |
| `-U peephole` | La contraseña compartida | En tu `server/.env` y en la carpeta compartida del Drive del equipo |
| `-U postgres` | Tu contraseña personal de `postgres` | Solo la sabes tú: la elegiste al instalar PostgreSQL |

## Comprobar que PostgreSQL funciona

| Para… | Comando |
| :---- | :---- |
| Ver la versión instalada, que tiene que ser la 17 | `psql --version` |
| Comprobar que acepta conexiones | `pg_isready -h localhost -p 5432` |
| Ver si el servicio está arrancado | `Get-Service postgresql-x64-17` |
| Arrancar el servicio, en una terminal abierta como administrador | `Start-Service postgresql-x64-17` |

## Crear el usuario y la base de datos

Solo se hace una vez. El primer comando te pide dos veces la contraseña del usuario nuevo: escribe la compartida. Después puede pedirte tu contraseña personal de `postgres`.

```powershell
createuser -U postgres --pwprompt peephole
createdb -U postgres --owner peephole peephole
```

Comprueba que puedes conectarte. Tiene que aparecer `PostgreSQL 17`:

```powershell
psql -U peephole -d peephole -c "select version();"
```

Las tablas no se crean a mano: las crean las migraciones de Flyway al arrancar el servidor.

## Conectarte y consultar

```powershell
psql -U peephole -d peephole
```

Ya dentro, el cursor cambia a `peephole=>`:

| Para… | Escribe |
| :---- | :---- |
| Ver todas las tablas | `\dt` |
| Ver las columnas de una tabla | `\d visits` |
| Ver qué migraciones se han aplicado | `SELECT version, description, success FROM flyway_schema_history;` |
| Consultar datos | `SELECT * FROM visits LIMIT 10;` |
| Ver a qué base y con qué usuario estás conectada | `\conninfo` |
| Ver la ayuda de los comandos | `\?` |
| Salir | `\q` |

- `visits` es un ejemplo: cámbialo por la tabla que quieras ver. Si `\dt` avisa de que no encuentra ninguna relación, es que todavía no se ha aplicado ninguna migración que cree tablas
- Las consultas SQL terminan en punto y coma (`;`). Si lo olvidas, `psql` espera a que lo escribas en la línea siguiente
- Si un resultado es largo y la terminal se queda en pausa, pulsa `q` para volver
- Para una consulta rápida sin entrar en `psql`: `psql -U peephole -d peephole -c "\dt"`

Puedes consultar y probar datos en tu base local, pero **no cambies la estructura de las tablas a mano**: eso solo se hace con migraciones.

## Ver bases de datos y usuarios

Estos comandos te piden tu contraseña personal de `postgres`:

| Para… | Comando |
| :---- | :---- |
| Ver todas las bases de datos | `psql -U postgres -l` |
| Ver todos los usuarios | `psql -U postgres -c "\du"` |

## Cambiar la contraseña del usuario `peephole`

Solo hace falta si la contraseña compartida cambia. Entra con tu usuario `postgres`:

```powershell
psql -U postgres
```

Ya dentro, escribe el comando y la contraseña nueva cuando te la pida. Después, sal con `\q`:

```text
\password peephole
```

Actualiza también `DB_PASSWORD` en tu `server/.env`: si no coinciden, el servidor no podrá conectarse.

## Resetear tu base de datos local

Borra tu base y la crea vacía: al arrancar el servidor, Flyway vuelve a aplicar todas las migraciones desde el principio. **Pierdes los datos que tuvieras en local**, pero nada del repositorio ni de las demás.

Para el servidor si está arrancado (`Ctrl+C`) y lanza:

```powershell
dropdb -U postgres peephole
createdb -U postgres --owner peephole peephole
```

## Si algo no va

- **Un error al conectar o con el `.env`:** mira los [problemas frecuentes de la puesta en marcha](../setup.es.md#problemas-frecuentes)
- **Un error de Flyway:** mira la tabla de errores de [la guía de migraciones](flyway-migrations.md#si-algo-falla)
- **`psql` avisa de que la página de códigos de la consola es distinta:** puedes ignorarlo. Si ves mal las tildes, escribe `chcp 1252` antes de abrir `psql`
