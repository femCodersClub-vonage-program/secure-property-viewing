# Guía de contribución

🇬🇧 [Read in English](CONTRIBUTING.md)

Gracias por formar parte de Peephole. Esta guía recoge cómo trabajamos en el equipo, desde que se escribe una spec hasta que el código llega a `main`, de modo que cualquiera que se incorpore pueda seguir el flujo sin depender de explicaciones de palabra.

Algunas de estas prácticas son estándar en la industria, y otras las mantenemos por su valor formativo, aunque en un equipo pequeño podrían simplificarse. Cuando es así, lo indicamos.

## Índice

1. [Del problema al código](#del-problema-al-código)  
2. [Estructura del repositorio](#estructura-del-repositorio)  
3. [Tareas en el GitHub Project](#tareas-en-el-github-project)  
4. [Ramas](#ramas)  
5. [Antes de abrir una pull request](#antes-de-abrir-una-pull-request)  
6. [Pull requests y revisión](#pull-requests-y-revisión)  
7. [Integración continua](#integración-continua)  
8. [Testing](#testing)  
9. [IA en el proyecto: agentes, skills y tools](#ia-en-el-proyecto-agentes-skills-y-tools)  
10. [Convenciones](#convenciones)  
11. [Migraciones de base de datos](#migraciones-de-base-de-datos)  
12. [Changelog](#changelog)  
13. [Definition of Done](#definition-of-done)  
14. [Seguimiento y dudas](#seguimiento-y-dudas)

## Del problema al código

Trabajamos con **Spec-Driven Development (SDD)**, así que ninguna funcionalidad empieza por el código:

1. **Spec**: qué se construye, por qué y con qué criterios de aceptación. Se guarda en `specs/`  
2. **Revisión**: la tech lead y el equipo validan la spec antes de seguir  
3. **Plan técnico**: cómo se va a implementar  
4. **Tareas**: el plan se divide en issues del GitHub Project  
5. **Implementación**: cada PR enlaza su issue y la spec de la que parte

Si durante el trabajo aparece una decisión de arquitectura relevante, se registra como ADR en `docs/adr/`, con el contexto, la decisión, las alternativas descartadas y sus consecuencias. Los ADR se numeran de forma correlativa (`0001-tech-stack.md`) y parten de [`docs/adr/template.md`](docs/adr/template.md).

## Estructura del repositorio

```text
secure-property-viewing/
├── .claude/
│   ├── agents/                  # Agentes del proyecto
│   ├── skills/                  # Skills del equipo
│   └── settings.json            # Permisos y archivos excluidos para la IA
├── .github/
│   ├── ISSUE_TEMPLATE/          # Plantillas de issues
│   ├── scripts/                 # Scripts que ejecuta el CI, como la comprobación de las reglas de migraciones
│   ├── workflows/               # Integración continua con GitHub Actions
│   ├── CODEOWNERS               # Revisión asignada automáticamente
│   └── PULL_REQUEST_TEMPLATE.md # Plantilla de pull requests
├── client/
│   └── AGENTS.md                # Instrucciones específicas del cliente
├── server/
│   ├── .env.example             # Plantilla de variables de entorno del servidor, sin valores reales
│   └── AGENTS.md                # Instrucciones específicas del servidor
├── e2e/                         # Tests end-to-end de los recorridos
├── specs/                       # Especificaciones de cada funcionalidad
├── docs/
│   ├── adr/                     # Decisiones de arquitectura
│   ├── architecture/            # Visión general y diagramas en Mermaid
│   ├── guides/                  # Guías sobre problemas comunes del equipo, en español
│   ├── images/                  # Imágenes de la documentación
│   ├── presentations/           # Presentaciones del proyecto
│   ├── setup.md                 # Puesta en marcha en local, paso a paso (setup.es.md en español)
│   ├── user-journeys.md         # Recorridos de la aplicación, paso a paso
│   └── vonage.md                # APIs y herramientas de Vonage
├── .editorconfig                # Formato común entre editores
├── .gitignore
├── AGENTS.md                    # Instrucciones generales del proyecto
├── CHANGELOG.md                 # Registro de cambios, generado automáticamente
├── CONTRIBUTING.md              # Flujo de trabajo y convenciones
├── CONTRIBUTING.es.md           # Versión en español
├── LICENSE
├── README.md                    # Versión en inglés
├── README.es.md                 # Versión en español
└── SECURITY.md                  # Cómo reportar una vulnerabilidad
```

Los documentos de `docs/` están en inglés, siguiendo las convenciones del proyecto.

## Tareas en el GitHub Project

El GitHub Project es la única fuente de tareas. Cada issue tiene una persona asignada y enlaza la spec correspondiente.

- **Labels** por tipo (`enhancement`, `bug`, `documentation`, `spec`, `adr`, `accessibility`) y por grupo (`client`, `server`, `devops`, `qa`, `e2e`). `blocked` marca una issue que no puede avanzar, con el motivo en un comentario. Antes de crear un label nuevo, se comprueba si ya existe uno que sirva  
- **Milestones** por semana del programa, para ver de un vistazo qué entra en cada una

Las issues se abren con las plantillas de `.github/ISSUE_TEMPLATE/`. El título empieza por el grupo y un número correlativo dentro de él, a partir de 01: `server-01: Add OTP verification endpoint`. Los grupos son `client`, `server`, `devops`, `qa` y `docs`, y cada issue lleva también el label correspondiente (`documentation` para el grupo `docs`).

## Ramas

main  ◄──  dev  ◄──  ramas de cada participante

- **`main`**: versión estable. Solo recibe cambios desde `dev` al cerrar cada hito  
- **`dev`**: rama de integración del equipo y rama por defecto del repositorio  
- **Ramas de trabajo**: cada participante crea las suyas desde `dev`, con nombres en inglés, como `feature/otp-verification` o `fix/visit-reminder`

`main` y `dev` están protegidas: no admiten push directo y solo aceptan cambios mediante PR, con la revisión de la tech lead y la integración continua en verde.

> Muchas empresas trabajan con trunk-based development, con ramas cortas directamente contra `main`. Mantenemos `dev` como rama intermedia porque, en un equipo en formación, da margen para integrar y probar antes de tocar la versión estable.

## Antes de abrir una pull request

1. Actualiza tu rama con los últimos cambios de `dev`  
2. Pasa los tests en local  
3. Pasa los **agentes de revisión** sobre tus cambios y resuelve lo que señalen: `docs-reviewer` siempre, y `ui-reviewer` cuando el cambio toca `client/`  
4. Revisa que entiendes y puedes explicar cada línea, también la que haya generado la IA

>   
> En muchas empresas la revisión con IA la hace un bot en la CI. Aquí pedimos pasarla también en local porque es la mejor forma de aprender a leer y corregir lo que señala, y la CI actúa como red de seguridad.

## Pull requests y revisión

- Todas las PR van contra `dev`  
- La descripción sigue la plantilla del repositorio: qué cambia, por qué, qué queda fuera y cómo probarlo  
- La PR enlaza su issue con `Closes #n`, para que la issue se cierre al fusionarla  
- `CODEOWNERS` asigna la revisión a la tech lead automáticamente  
- Si hay una decisión discutible, se explica en la descripción antes de que alguien la encuentre en el diff  
- En la revisión se distingue siempre lo bloqueante de las sugerencias  
- Cuando la tech lead la aprueba, **quien abrió la PR la fusiona en `dev`** con *Squash and merge*. El título de la PR pasa a ser el mensaje del commit. Si se suben commits después de la aprobación, la aprobación se descarta y hace falta una nueva revisión  
- Solo la tech lead fusiona `dev` en `main`, con un merge normal, al cerrar cada hito

## Integración continua

Cada PR ejecuta [`.github/workflows/ci.yml`](.github/workflows/ci.yml) en GitHub Actions: el lint, el formato, los tests y la compilación del cliente, el formato, la compilación y los tests del servidor contra una base de datos PostgreSQL vacía, y la comprobación de las [reglas de migraciones](#migraciones-de-base-de-datos). Si es viable, también lanzará los agentes de revisión, para que ese paso no dependa solo de que cada persona lo haga en local.

## Testing

Cada funcionalidad se entrega con sus tests, y los criterios de aceptación de la spec son el punto de partida para escribirlos.

| Nivel | Qué cubre |
| :---- | :---- |
| **Unitarios** | Lógica de negocio aislada en `client/` y en `server/` |
| **Integración** | Endpoints del servidor y su relación con la base de datos y con Vonage, usando dobles de prueba en lugar de llamadas reales |
| **End-to-end** | Los recorridos completos de la aplicación, desde el punto de vista de quien la usa |

Estamos valorando trabajar con **TDD** en la lógica de negocio. El servidor se prueba con JUnit, Spring Boot Test y Mockito, y el cliente con Vitest y Testing Library, según el [ADR 0001](docs/adr/0001-tech-stack.md). Los tests de integración se lanzan contra una base de datos PostgreSQL real, nunca contra un sustituto en memoria.

## IA en el proyecto: agentes, skills y tools

La IA forma parte del trabajo diario, y por eso la tratamos como una herramienta más, con su propia configuración versionada en el repositorio y sus propias reglas.

| Elemento | Para qué sirve | Dónde |
| :---- | :---- | :---- |
| **Instrucciones** | Contexto y convenciones del proyecto, generales y por carpeta | `AGENTS.md` en la raíz, en `client/` y en `server/` |
| **Agentes** | Asistentes especializados que revisan una rama antes de su pull request: `docs-reviewer` para la documentación y el idioma, y `ui-reviewer` para la interfaz del cliente, que lanza `design-system-reviewer` y `accessibility-reviewer` | `.claude/agents/` |
| **Skills** | Procedimientos reutilizables del equipo, como redactar una spec o un ADR | `.claude/skills/` |
| **Tools** | Conexiones externas que pueden usar los agentes, empezando por los servidores MCP de Vonage | Configuración de MCP del proyecto |

A lo largo de las mentorías iremos viendo cómo sacarle partido a la IA, y estos son los principios de partida:

- **La spec va primero.** Un asistente rinde mucho mejor sobre una especificación clara que cuando se le pide improvisar  
- **Lo que genera la IA se revisa como cualquier otro código.** Quien abre la PR es responsable de entender y poder explicar cada línea  
- **Lo que diga un asistente sobre Vonage se contrasta con la documentación oficial.** Lo que sabe de una API puede estar desactualizado, así que consultamos el Documentation MCP Server en lugar de fiarnos de su memoria  
- **Nunca se pegan credenciales, claves ni datos personales** en un asistente  
- **La IA es para aprender, no para saltarse el aprendizaje.** El objetivo es que cada participante pueda defender el proyecto en una entrevista

## Convenciones

- `.editorconfig` para que todos los editores compartan indentación, finales de línea y codificación  
- oxlint y Prettier en `client/`, y Spotless con palantir-java-format en `server/`. Formatea antes de cada commit con `npm run format` o `./mvnw spotless:apply`: el CI falla si el código no está formateado  
- TypeScript en modo estricto, sin `any`, sin aserciones de no nulo (`!`) y sin `@ts-ignore`: oxlint hace fallar el CI con cualquiera de ellos. El resto de reglas de lenguaje de cada carpeta están en [`client/AGENTS.md`](client/AGENTS.md) y [`server/AGENTS.md`](server/AGENTS.md)  
- Commits siguiendo [Conventional Commits](https://www.conventionalcommits.org/), por ejemplo `feat(server): add OTP verification endpoint`  
- Código, identificadores, nombres de rama y documentación en inglés americano. El README, esta guía y las guías paso a paso que sigue todo el equipo, como [`docs/setup.es.md`](docs/setup.es.md), tienen también versión en español terminada en `.es.md`, así que cualquier cambio en un idioma se lleva al otro en la misma pull request. Las guías del equipo de [`docs/guides/`](docs/guides/README.md) son la excepción: se escriben solo en español  
- **Visit** es el término del dominio para la visita por vídeo a un inmueble: `Visit` en el código y *visit* en la interfaz y la documentación. No usamos *viewing*, *showing* ni *tour*, para que un mismo concepto no tenga dos nombres  
- **Estructura de carpetas:** las dos aplicaciones se organizan por funcionalidad y cada archivo tiene un sitio fijo, como describen el [`AGENTS.md`](AGENTS.md#where-files-go) de la raíz, [`client/AGENTS.md`](client/AGENTS.md#folder-structure) y [`server/AGENTS.md`](server/AGENTS.md#folder-structure). El agente `docs-reviewer` lo comprueba en cada pull request  
- **Accesibilidad:** el objetivo es WCAG 2.1 AA, según el [ADR 0003](docs/adr/0003-accessibility-and-dependencies.md), con las reglas concretas en el [`AGENTS.md`](AGENTS.md#accessibility) de la raíz  
- **Design system:** el cliente reutiliza los componentes de `client/src/components/ui/` y los tokens de diseño de `client/src/index.css`. No se añaden estilos fuera del design system salvo que de verdad hagan falta, como explica [`client/AGENTS.md`](client/AGENTS.md#design-system)  
- **Dependencias:** cada dependencia nueva se justifica en la descripción de la pull request: por qué hace falta, su licencia y si está bien mantenida. Si algo que ya usamos, o algo parecido, resuelve el problema, la pull request se rechaza ([ADR 0003](docs/adr/0003-accessibility-and-dependencies.md))

## Migraciones de base de datos

El esquema de la base de datos solo cambia mediante migraciones de Flyway en `server/src/main/resources/db/migration/`. Si dos personas cambian la base de datos a la vez, es fácil que choquen, así que seguimos cuatro reglas:

- **Avisarlo en el plan técnico.** Si una funcionalidad crea o cambia una tabla, su plan técnico dice qué tabla y qué columnas. Los solapamientos se ven en la revisión, antes de que nadie escriba código  
- **Nombrar las migraciones con la fecha y la hora en UTC**, como `V20261101_1430__create_visits_table.sql`. Es difícil que dos ramas coincidan en el mismo minuto, mientras que con números seguidos como `V3` y `V4` chocan constantemente  
- **No editar nunca una migración que ya esté en `dev`.** Flyway guarda una huella (checksum) de cada migración aplicada y se niega a arrancar si alguna cambia. Para corregir algo, se añade una migración nueva  
- **Antes de hacer merge, actualizar la rama desde `dev`.** Si tu migración es más antigua que la más reciente de `dev`, renómbrala con la fecha y hora actuales, o Flyway la dará por desordenada

El CI comprueba estas reglas en cada pull request y falla si se incumple alguna. La guía [`docs/guides/flyway-migrations.md`](docs/guides/flyway-migrations.md) explica cómo crear una migración y cómo salir de los errores más habituales.

## Changelog

La tech lead genera el `CHANGELOG.md` con IA a partir del historial de commits al cerrar cada hito, así que nadie lo edita a mano. Como el squash convierte el título de cada PR en un commit, el título tiene que seguir Conventional Commits y describir bien el cambio.

## Definition of Done

Una issue se da por terminada cuando cumple todo lo siguiente:

- [ ] Responde a los criterios de aceptación de su spec  
- [ ] Tiene sus tests y pasan en local y en la CI  
- [ ] Ha pasado los agentes de revisión y se ha resuelto lo que señalaron  
- [ ] Cuenta con la aprobación de la tech lead en la PR  
- [ ] La documentación afectada está actualizada, incluido un ADR si hubo una decisión de arquitectura

## Seguimiento y dudas

Tenemos una mentoría semanal online entre la tech lead y el equipo, y Slack para las dudas del día a día. Ninguna pregunta está de más: si algo de esta guía no queda claro, es la guía la que hay que mejorar.
