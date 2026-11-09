# Vonage CLI

Cada una trabaja con su propia cuenta y su propia aplicación de Vonage. El Vonage CLI permite crear la aplicación, añadirle las APIs que necesita y revisar su configuración desde la terminal, sin pasar por el Dashboard. Esta guía recoge los pasos que seguimos y los tropiezos más habituales.

Los pasos salen de la [documentación oficial del Vonage CLI](https://developer.vonage.com/en/vonage-cli/getting-started). Si algo no coincide, manda la documentación oficial.

## Cómo se organiza Vonage

```text
Cuenta de Vonage  →  API key + API secret (una pareja por cuenta)
 └── Aplicación   →  Application ID + clave privada
      └── Capabilities: Messages, Verify, Video…
```

- La **API key** y el **API secret** son de tu cuenta, no de una aplicación. Están en *API Settings*, en el Dashboard de Vonage
- La **aplicación** es la de Peephole, y la creamos con el CLI
- Usa siempre tu cuenta, nunca las credenciales de otra compañera: gastarías sus créditos

## Requisitos

- Node.js 18.20 o superior. El proyecto ya pide 22.22.2, así que si el cliente te funciona, te vale

Los comandos están en una sola línea para que funcionen igual en PowerShell, zsh y fish, en la terminal de VS Code o en cualquier otra. Esta guía se ha probado en macOS.

## 1. Instalar el CLI

```powershell
npm install -g @vonage/cli
vonage --version
```

### Si falla con `EACCES` en macOS

Si instalaste Node.js con el instalador oficial, los paquetes globales van a una carpeta del sistema y npm no puede escribir en ella. No uses `sudo`: cambia la carpeta de los paquetes globales a una tuya.

```bash
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
```

Después añade esa carpeta al `PATH`, según tu terminal:

| Terminal | Comando |
| :---- | :---- |
| zsh (la de macOS por defecto) | `echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc` y abre una terminal nueva |
| fish | `fish_add_path ~/.npm-global/bin` |

Vuelve a lanzar `npm install -g @vonage/cli`. Si la instalación termina bien pero `vonage` no aparece como comando, falta el paso del `PATH`.

## 2. Conectar tu cuenta

Copia la API key y el API secret de *API Settings*. Si no sabes cuál es tu secret, crea uno nuevo con **Add new secret**: Vonage permite dos a la vez.

```powershell
vonage auth set --api-key='TU_API_KEY' --api-secret='TU_API_SECRET'
vonage auth show
```

`auth set` comprueba las credenciales antes de guardarlas, y `auth show` las enseña tapadas y las vuelve a comprobar.

Sin más opciones, el CLI guarda la configuración en `~/.vonage/config.json`, fuera del repositorio. Con `--local` la guardaría en un archivo `.vonagerc` de la carpeta en la que estés: no lo uses dentro del repositorio.

## 3. Crear tu aplicación

`apps create` guarda la clave privada como `private.key` **en la carpeta en la que estás**, así que créala siempre fuera del repositorio:

```bash
mkdir -p ~/vonage
cd ~/vonage
vonage apps create 'Peephole TU_NOMBRE'
```

Apunta el `Application ID` que aparece. Después dale a la clave un nombre propio, para que otra aplicación no la sobrescriba, y deja que solo tú puedas leerla:

```bash
mv private.key peephole-TU_NOMBRE.key
chmod 600 peephole-TU_NOMBRE.key
```

Evita las carpetas que se sincronizan con la nube, como `~/Documents` con iCloud activado.

## 4. Añadir la API que te toca

Cada persona añade la capability de la API que construye. Messages pide dos webhooks, una URL *inbound* y otra *status*, que apuntan al servidor de Railway según el [ADR 0002](../adr/0002-deployment-railway.md). Las rutas exactas están pendientes de definir en la spec de mensajes. Hasta entonces, pregunta a la tech lead cuáles usar:

```powershell
vonage apps capabilities update TU_APPLICATION_ID messages --messages-inbound-url='URL_INBOUND' --messages-status-url='URL_STATUS' --messages-version='v1'
```

Mientras el servidor no tenga esos endpoints, se pueden enviar mensajes, pero Vonage no puede avisar del estado de cada entrega. Si las rutas cambian, se repite el mismo comando con las nuevas.

## Credenciales: nunca en el repositorio ni en un asistente de IA

- `~/.vonage/config.json`, cualquier `.vonagerc` y los archivos `.key` contienen credenciales. El archivo `.vonagerc` guarda incluso la clave privada
- `.vonagerc` y `*.key` están en `.gitignore`, y `.claude/settings.json` impide que los lea un asistente. Aun así, no los crees dentro del repositorio
- Nunca pegues la API secret, la clave privada ni el contenido de estos archivos en un asistente de IA
- Las credenciales se comparten con el equipo por la vía privada acordada, nunca en el repositorio ni en una issue

## Avisos que puedes ignorar

| Aviso | Por qué aparece |
| :---- | :---- |
| `npm warn EBADENGINE … @stoplight/prism-*` | Lo pide el servidor de pruebas del CLI (`vonage mock`), que no usamos. Desaparece si actualizas Node.js |
| `npm warn deprecated …` | Dependencias internas del CLI |
| `Error: … DeprecationWarning: Passing invalid argument types to fs.existsSync` | Aviso de Node.js 24 sobre el código del CLI. Si después aparece ✅, todo ha ido bien |

## Problemas frecuentes

| Error | Solución |
| :---- | :---- |
| `EACCES: permission denied` al instalar | [Cambia la carpeta de los paquetes globales](#si-falla-con-eacces-en-macos) |
| `Unknown command: vonage` o `command not found` | Falta añadir `~/.npm-global/bin` al `PATH` |
| `ENOENT: process.cwd failed` | La carpeta en la que está la terminal se ha borrado o movido. Haz `cd` a otra y repite el comando |

Algunas páginas de Vonage todavía usan la sintaxis antigua, `vonage config:set --apiKey=…`. Con la versión 3 del CLI, el comando es `vonage auth set`.
