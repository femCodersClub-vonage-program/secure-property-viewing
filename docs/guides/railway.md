# Railway desde la terminal

Peephole está desplegado en Railway. Esta guía explica cómo ver qué está pasando desde la terminal de VS Code: el estado de cada servicio, los registros de un despliegue que ha fallado y las variables.

Cada servicio se despliega solo cuando llega un cambio a `dev` en su carpeta. No hace falta lanzar nada a mano para desplegar.

| Servicio | Carpeta | Dirección |
| :---- | :---- | :---- |
| `client` | `client/` | <https://client-production-c53a.up.railway.app> |
| `server` | `server/` | En el panel de Railway, en el servicio `server`, apartado *Networking*. No se publica en el repositorio porque solo la necesita el equipo |
| `Postgres` | Ninguna | Solo accesible desde dentro de Railway |

El porqué de esta organización está en el [ADR 0002](../adr/0002-deployment-railway.md).

## Conectarte al proyecto

Solo la primera vez. Necesitas que te hayan invitado al proyecto y tener instalado el CLI de Railway, siguiendo [su documentación oficial](https://docs.railway.com/guides/cli).

Desde la raíz del repositorio:

```powershell
railway login
railway link --project peephole
```

Comprueba que estás en el proyecto correcto:

```powershell
railway status
```

## Ver el estado y los registros

| Para… | Comando |
| :---- | :---- |
| Ver si cada servicio está funcionando | `railway service list` |
| Ver los registros del servidor | `railway logs --service server` |
| Ver los registros del cliente | `railway logs --service client` |
| Ver las últimas 50 líneas | `railway logs --service server --lines 50` |
| Ver cómo fue la compilación | `railway logs --service server --build` |

## Si un despliegue falla

1. Mira qué servicio ha fallado con `railway service list`
2. Si falló al compilar, mira `railway logs --service server --build`. Si compiló pero no arranca, mira `railway logs --service server`
3. Busca la primera línea de error, no la última: las siguientes suelen ser consecuencia de esa
4. Arréglalo en una rama y abre una pull request contra `dev`, como cualquier otro cambio. Al fusionarla se despliega de nuevo

| Qué ves | Por qué pasa | Cómo se arregla |
| :---- | :---- | :---- |
| `Could not resolve placeholder` | Falta una variable en el servicio | Añádela, como se explica abajo |
| `password authentication failed` o `Connection refused` | Las variables de la base de datos no coinciden o `Postgres` no está en marcha | Comprueba el estado de `Postgres` y las variables de `server` |
| Un error de Flyway al arrancar | Una migración tiene un problema | Mira la tabla de errores de [la guía de migraciones](flyway-migrations.md#si-algo-falla) |
| `Blocked by CORS` en el navegador | `CORS_ALLOWED_ORIGINS` no incluye la dirección del cliente | Comprueba esa variable en `server` |

## Añadir una variable

Añade también la variable a `.env.example` con un valor de ejemplo y a `docs/setup.md` y `docs/setup.es.md`, como pide `server/AGENTS.md`.

```powershell
railway variable set --service server NOMBRE_VARIABLE=valor
```

Al guardarla, el servicio se vuelve a desplegar.

El servicio `server` necesita `LOAD_DEMO_DATA=true` para cargar los datos de ejemplo de `db/seed/`.

## Lo que no se hace

- **No muestres las variables en pantalla compartida ni las pegues en un asistente de IA.** `railway variable list` enseña las contraseñas en claro
- **No lances los tests contra Railway.** `railway run` inyecta las variables del proyecto, incluida `DB_URL`, y los tests escribirían en esa base de datos
- **No guardes secretos en variables `VITE_` del cliente.** Acaban en el navegador, a la vista de cualquiera
