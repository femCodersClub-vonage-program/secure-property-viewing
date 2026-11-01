# Migraciones con Flyway

Las tablas de la base de datos solo se crean o se cambian con migraciones de Flyway: archivos `.sql` que se aplican en orden y que nadie toca a mano. Cuando varias trabajamos a la vez en el backend es fácil que dos migraciones choquen. Esta guía explica cómo evitarlo y cómo salir del problema si te pasa.

Las reglas completas están en la sección «Migraciones de base de datos» de [`CONTRIBUTING.es.md`](../../CONTRIBUTING.es.md#migraciones-de-base-de-datos).

## Crear una migración

1. Comprueba que la tabla o el cambio aparece en el plan técnico de tu spec. Si no aparece, habla antes con la tech lead
2. Saca la fecha y la hora actuales en UTC:

   ```powershell
   (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmm")
   ```

   En macOS: `date -u +%Y%m%d_%H%M`

3. Crea el archivo en `server/src/main/resources/db/migration/` con este nombre, todo en minúsculas:

   ```text
   V<fecha>_<hora>__<descripción>.sql
   V20261103_1000__create_visits_table.sql
   ```

   Entre la hora y la descripción van **dos** guiones bajos

4. Arranca el servidor o lanza `.\mvnw.cmd verify` (en macOS, `./mvnw verify`): Flyway aplica la migración a tu base de datos local

## Dos personas creando tablas a la vez

### Cada una crea una tabla distinta: no chocan

Ana crea `visits` y Bea crea `listings`, cada una en su rama:

```text
Ana:  V20261103_1000__create_visits_table.sql
Bea:  V20261103_1130__create_listings_table.sql
```

Los nombres no coinciden gracias a la fecha y la hora, y las tablas son distintas. Cuando las dos ramas llegan a `dev` y cada una hace `pull`, Flyway aplica en su base local la migración de la otra.

Solo hay un tropiezo posible: si la rama de Bea se fusiona antes, la migración de Ana (las 10:00) queda más antigua que la última de `dev` (las 11:30). El CI lo detecta y Ana lo arregla así:

1. Actualiza su rama desde `dev`
2. Renombra su archivo con la fecha y la hora actuales
3. [Resetea su base de datos local](#resetear-tu-base-de-datos-local), porque ya tenía aplicada la migración con el nombre antiguo

### Las dos necesitan la misma tabla: sí chocan

Si las dos necesitan `visits`, o la tabla de una depende de la de la otra, cada una no puede crearla por su cuenta: la segunda migración fallaría con `relation "visits" already exists`.

Esto se resuelve antes de escribir código. Al revisar los planes técnicos, la tech lead decide quién crea la tabla:

- Una la crea y la otra espera: su issue dice «depende de #n» y lleva la label `blocked` hasta que la primera se fusiona
- O la tabla se saca a una issue pequeña propia, que se hace primero y sobre la que trabajan las dos

## Qué comprueba el CI

En cada pull request, el CI falla si:

- Editas, renombras o borras una migración que ya está en `dev`
- El nombre no sigue el formato `V<fecha>_<hora>__<descripción>.sql`
- Tu migración es más antigua que la última de `dev`
- Las migraciones no se pueden aplicar en orden sobre una base de datos vacía, por ejemplo porque dos crean la misma tabla o tienen la misma versión

## Si algo falla

| Qué ves | Qué ha pasado | Cómo salir |
| :---- | :---- | :---- |
| `Detected resolved migration not applied to database` | Tienes una migración más antigua que otra que ya está aplicada en tu base | Renombra tu migración con la fecha y la hora actuales y [resetea tu base local](#resetear-tu-base-de-datos-local) |
| `Detected applied migration not resolved locally` | Tu base tiene aplicada una migración que tu rama no tiene, normalmente porque has cambiado de rama | Vuelve a la rama que tiene esa migración, o [resetea tu base local](#resetear-tu-base-de-datos-local) |
| `Migration checksum mismatch` | Has editado una migración que ya estaba aplicada en tu base | Si todavía no está en `dev`, [resetea tu base local](#resetear-tu-base-de-datos-local). Si ya está en `dev`, deshaz el cambio y crea una migración nueva |
| `Found more than one migration with version` | Dos archivos tienen la misma fecha y hora | Renombra el tuyo con la fecha y la hora actuales |
| `relation "..." already exists` | Otra migración ya crea esa tabla | Es el caso de [la misma tabla](#las-dos-necesitan-la-misma-tabla-sí-chocan): habla con la tech lead |
| El CI dice `This migration is already in the base branch` | Has tocado una migración que ya está en `dev` | Deshaz el cambio en ese archivo y crea una migración nueva |
| El CI dice `It is older than ...` | Tu migración es más antigua que la última de `dev` | Renómbrala con la fecha y la hora actuales |
| El CI dice `Name it V<yyyyMMdd>_<HHmm>__<description>.sql` | El nombre no sigue el formato | Renómbrala como en el paso 3 de [crear una migración](#crear-una-migración) |

## Resetear tu base de datos local

Borra tu base local y la crea vacía: al arrancar el servidor, Flyway vuelve a aplicar todas las migraciones desde el principio. **Pierdes los datos que tuvieras en local**, pero nada del repositorio ni de las demás.

1. Para el servidor si está arrancado (`Ctrl+C`)
2. Borra la base y créala de nuevo. Te pedirá tu contraseña personal de `postgres`:

   ```powershell
   dropdb -U postgres peephole
   createdb -U postgres --owner peephole peephole
   ```

   En macOS, quita `-U postgres`

3. Arranca el servidor o lanza `.\mvnw.cmd verify` desde `server/` (en macOS, `./mvnw verify`)
