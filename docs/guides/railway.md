# Railway desde la terminal

Peephole está desplegado en Railway. Esta guía explica cómo ver qué está pasando desde la terminal de VS Code: el estado de cada servicio, los registros de un despliegue que ha fallado y las variables.

Cada servicio se despliega solo cuando llega un cambio a `dev` en su carpeta. No hace falta lanzar nada a mano para desplegar.

| Servicio | Carpeta | Dirección |
| :---- | :---- | :---- |
| `client` | `client/` | <https://client-production-c53a.up.railway.app> |
| `server` | `server/` | En el panel de Railway, en el servicio `server`, apartado *Networking*. No se publica en el repositorio porque solo la necesita el equipo |
| `Postgres` | Ninguna | Solo accesible desde dentro de Railway |

El porqué de esta organización está en el [ADR 0002](../adr/0002-deployment-railway.md).

## Cómo llegan las llamadas a la API

El navegador nunca llama directamente al servidor: llama a `/api` en la misma dirección del cliente, como en local. El servicio `client` sirve la web con Caddy y, siguiendo su `client/Caddyfile`, pasa todo lo que empieza por `/api/` al servidor por la red privada de Railway, en `server.railway.internal:8080`. Así el navegador ve un solo origen y la cookie de sesión de la agencia funciona, como decide el [ADR 0004](../adr/0004-agency-sign-in.md).

Para comprobarlo, abre `https://client-production-c53a.up.railway.app/api/health`: tiene que responder el servidor.

Los webhooks de Vonage son la excepción: siguen llamando a la dirección pública del servidor.

## Conectarte al proyecto

Solo la primera vez. Necesitas que te hayan invitado al proyecto y tener instalado el CLI de Railway, siguiendo [su documentación oficial](https://docs.railway.com/guides/cli).

Desde la raíz del repositorio:

```powershell
railway login
railway link --project peephole
```

`railway link` te pide elegir el workspace, el proyecto, el entorno (`production`) y un servicio. Elige `server` como servicio: pulsar Esc cancela todo el enlace, y los comandos de esta guía indican el servicio con `--service` de todas formas.

Comprueba que estás en el proyecto correcto:

```powershell
railway status
```

## Ver el estado y los registros

| Para… | Comando |
| :---- | :---- |
| Ver si cada servicio está funcionando | `railway service list` |
| Ver los últimos despliegues de un servicio y su estado | `railway deployment list --service server` |
| Ver los registros del servidor | `railway logs --service server` |
| Ver los registros del cliente | `railway logs --service client` |
| Ver las últimas 50 líneas | `railway logs --service server --lines 50` |
| Ver solo los errores | `railway logs --service server --lines 20 --filter "@level:error"` |
| Ver cómo fue la compilación | `railway logs --service server --build` |

## Si un despliegue falla

1. Mira qué servicio ha fallado con `railway service list`
2. Si falló al compilar, mira `railway logs --service server --build`. Si compiló pero no arranca, mira `railway logs --service server`
3. Busca la primera línea de error, no la última: las siguientes suelen ser consecuencia de esa
4. Arréglalo en una rama y abre una pull request contra `dev`, como cualquier otro cambio. Al fusionarla se despliega de nuevo

| Qué ves | Por qué pasa | Cómo se arregla |
| :---- | :---- | :---- |
| `Could not resolve placeholder` | Falta una variable en el servicio | Añádela, como se explica abajo |
| `PHONE_HASH_SECRET is not set` o `VONAGE_VERIFY_… is not set` | Falta una variable de la verificación de teléfono | Añádela, como se explica abajo |
| `password authentication failed` o `Connection refused` | Las variables de la base de datos no coinciden o `Postgres` no está en marcha | Comprueba el estado de `Postgres` y las variables de `server` |
| Un error de Flyway al arrancar | Una migración tiene un problema | Mira la tabla de errores de [la guía de migraciones](flyway-migrations.md#si-algo-falla) |
| `502 Bad Gateway` en una dirección `/api/...` del cliente | Caddy no llega al servidor por la red privada: `server` no está en marcha o no escucha en el puerto `8080` | Comprueba el estado de `server` y sus registros. Mira también `railway logs --service client`, donde Caddy explica por qué falló |
| `Blocked by CORS` en el navegador | Algo llama a la dirección pública del servidor en lugar de a `/api` en la dirección del cliente | Las llamadas del cliente usan siempre rutas relativas, como `/api/health`. El servidor no envía cabeceras CORS, así que ninguna otra web puede leer sus respuestas |
| `NEEDS_APPROVAL` en `railway deployment list` | El despliegue no ha fallado: Railway lo ha retenido hasta que alguien con permiso lo apruebe | Avisa a la tech lead para que lo apruebe en el panel de Railway |

## Añadir una variable

Añade también la variable a `.env.example` con un valor de ejemplo y a `docs/setup.md` y `docs/setup.es.md`, como pide `server/AGENTS.md`.

```powershell
railway variable set --service server NOMBRE_VARIABLE=valor
```

Al guardarla, el servicio se vuelve a desplegar.

El servicio `server` necesita `LOAD_DEMO_DATA=true` para cargar los datos de ejemplo de `db/seed/`.

El servicio `server` también necesita `SESSION_COOKIE_SECURE=true`, para que la cookie de sesión de la agencia solo viaje por HTTPS, como decide el [ADR 0004](../adr/0004-agency-sign-in.md). La cookie `XSRF-TOKEN` sigue el mismo valor. Si falta, el servidor arranca igual pero envía las dos cookies sin `Secure`.

El servicio `server` también necesita las variables de la verificación de teléfono, o no arranca: `VONAGE_VERIFY_APPLICATION_ID` y `VONAGE_VERIFY_PRIVATE_KEY`, con la aplicación de Candé, y `PHONE_HASH_SECRET`. El valor de `PHONE_HASH_SECRET` en Railway está en la carpeta compartida del Drive y no se cambia nunca: si cambiara, los teléfonos ya guardados dejarían de coincidir con los nuevos y los límites por teléfono empezarían de cero.

El servicio `server` no tiene la variable `PORT`, así que escucha en el puerto `8080`, que es el que usa `client/Caddyfile`. Si algún día se añade `PORT`, hay que cambiar también el `Caddyfile`.

La variable `API_DOCS_ENABLED` no se pone en Railway: la documentación de la API (Swagger UI) solo se usa en local.

El servicio `client` no necesita ninguna variable para llegar a la API. `VITE_API_URL`, en `client`, y `CORS_ALLOWED_ORIGINS`, en `server`, se usaban antes del proxy y el código ya no las lee. Si todavía aparecen en Railway, se pueden borrar.

## Lo que no se hace

- **No muestres las variables en pantalla compartida ni las pegues en un asistente de IA.** `railway variable list` enseña las contraseñas en claro
- **No lances los tests contra Railway.** `railway run` inyecta las variables del proyecto, incluida `DB_URL`, y los tests escribirían en esa base de datos
- **No guardes secretos en variables `VITE_` del cliente.** Acaban en el navegador, a la vista de cualquiera
