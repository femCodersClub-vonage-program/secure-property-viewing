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
11. [Changelog](#changelog)  
12. [Definition of Done](#definition-of-done)  
13. [Seguimiento y dudas](#seguimiento-y-dudas)

## Del problema al código

Trabajamos con **Spec-Driven Development (SDD)**, así que ninguna funcionalidad empieza por el código:

1. **Spec**: qué se construye, por qué y con qué criterios de aceptación. Se guarda en `specs/`  
2. **Revisión**: la tech lead y el equipo validan la spec antes de seguir  
3. **Plan técnico**: cómo se va a implementar  
4. **Tareas**: el plan se divide en issues del GitHub Project  
5. **Implementación**: cada PR enlaza su issue y la spec de la que parte

Si durante el trabajo aparece una decisión de arquitectura relevante, se registra como ADR en `docs/adr/`, con el contexto, la decisión, las alternativas descartadas y sus consecuencias.

## Estructura del repositorio

```text
secure-property-viewing/
├── .claude/
│   ├── agents/                  # Agentes del proyecto
│   ├── skills/                  # Skills del equipo
│   └── settings.json            # Permisos y archivos excluidos para la IA
├── .github/
│   ├── ISSUE_TEMPLATE/          # Plantillas de issues
│   ├── workflows/               # Integración continua con GitHub Actions
│   ├── CODEOWNERS               # Revisión asignada automáticamente
│   └── PULL_REQUEST_TEMPLATE.md # Plantilla de pull requests
├── client/
│   └── AGENTS.md                # Instrucciones específicas del cliente
├── server/
│   └── AGENTS.md                # Instrucciones específicas del servidor
├── e2e/                         # Tests end-to-end de los recorridos
├── specs/                       # Especificaciones de cada funcionalidad
├── docs/
│   ├── adr/                     # Decisiones de arquitectura
│   ├── architecture/            # Visión general y diagramas en Mermaid
│   ├── guides/                  # Guías sobre problemas comunes del equipo
│   ├── images/                  # Imágenes de la documentación
│   ├── presentations/           # Presentaciones del proyecto
│   ├── user-journeys.md         # Recorridos de la aplicación, paso a paso
│   └── vonage.md                # APIs y herramientas de Vonage
├── .editorconfig                # Formato común entre editores
├── .env.example                 # Plantilla de variables de entorno, sin valores reales
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

- **Labels** por tipo (`enhancement`, `bug`, `documentation`, `spec`, `adr`, `accessibility`) y por capa (`client`, `server`, `e2e`). Antes de crear un label nuevo, se comprueba si ya existe uno que sirva  
- **Milestones** por semana del programa, para ver de un vistazo qué entra en cada una

Las issues se abren con las plantillas de `.github/ISSUE_TEMPLATE/`.

## Ramas

main  ◄──  dev  ◄──  ramas de cada participante

- **`main`**: versión estable. Solo recibe cambios desde `dev` al cerrar cada hito  
- **`dev`**: rama de integración del equipo  
- **Ramas de trabajo**: cada participante crea las suyas desde `dev`, con nombres en inglés, como `feature/otp-verification` o `fix/visit-reminder`

`main` y `dev` están protegidas: no admiten push directo y solo aceptan cambios mediante PR, con la revisión de la tech lead y la integración continua en verde.

> Muchas empresas trabajan con trunk-based development, con ramas cortas directamente contra `main`. Mantenemos `dev` como rama intermedia porque, en un equipo en formación, da margen para integrar y probar antes de tocar la versión estable.

## Antes de abrir una pull request

1. Actualiza tu rama con los últimos cambios de `dev`  
2. Pasa los tests en local  
3. Pasa los **agentes de revisión** sobre tus cambios y resuelve lo que señalen  
4. Revisa que entiendes y puedes explicar cada línea, también la que haya generado la IA

>   
> En muchas empresas la revisión con IA la hace un bot en la CI. Aquí pedimos pasarla también en local porque es la mejor forma de aprender a leer y corregir lo que señala, y la CI actúa como red de seguridad.

## Pull requests y revisión

- Todas las PR van contra `dev`  
- La descripción sigue la plantilla del repositorio: qué cambia, por qué, qué queda fuera y cómo probarlo  
- `CODEOWNERS` asigna la revisión a la tech lead automáticamente  
- Si hay una decisión discutible, se explica en la descripción antes de que alguien la encuentre en el diff  
- En la revisión se distingue siempre lo bloqueante de las sugerencias

## Integración continua

Cada PR ejecuta en GitHub Actions el lint, el formateo y los tests. Si es viable, también lanzará los agentes de revisión, para que ese paso no dependa solo de que cada persona lo haga en local.

## Testing

Cada funcionalidad se entrega con sus tests, y los criterios de aceptación de la spec son el punto de partida para escribirlos.

| Nivel | Qué cubre |
| :---- | :---- |
| **Unitarios** | Lógica de negocio aislada en `client/` y en `server/` |
| **Integración** | Endpoints del servidor y su relación con la base de datos y con Vonage, usando dobles de prueba en lugar de llamadas reales |
| **End-to-end** | Los recorridos completos de la aplicación, desde el punto de vista de quien la usa |

Estamos valorando trabajar con **TDD** en la lógica de negocio. Las herramientas de testing se decidirán junto con el stack.

## IA en el proyecto: agentes, skills y tools

La IA forma parte del trabajo diario, y por eso la tratamos como una herramienta más, con su propia configuración versionada en el repositorio y sus propias reglas.

| Elemento | Para qué sirve | Dónde |
| :---- | :---- | :---- |
| **Instrucciones** | Contexto y convenciones del proyecto, generales y por carpeta | `AGENTS.md` en la raíz, en `client/` y en `server/` |
| **Agentes** | Asistentes especializados, por ejemplo de revisión de código, de seguridad o de cobertura de tests | `.claude/agents/` |
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
- Linter y formatter comunes, que se concretarán junto con el stack  
- Commits siguiendo [Conventional Commits](https://www.conventionalcommits.org/), por ejemplo `feat(server): add OTP verification endpoint`  
- Código, identificadores, nombres de rama y documentación en inglés americano. El README y esta guía tienen también versión en español, así que cualquier cambio en un idioma se lleva al otro en la misma pull request  
- **Visit** es el término del dominio para la visita por vídeo a un inmueble: `Visit` en el código y *visit* en la interfaz y la documentación. No usamos *viewing*, *showing* ni *tour*, para que un mismo concepto no tenga dos nombres

## Changelog

El `CHANGELOG.md` se genera automáticamente con IA a partir de los Conventional Commits, así que no hace falta editarlo a mano. Por eso es importante que cada mensaje de commit describa bien el cambio.

## Definition of Done

Una issue se da por terminada cuando cumple todo lo siguiente:

- [ ] Responde a los criterios de aceptación de su spec  
- [ ] Tiene sus tests y pasan en local y en la CI  
- [ ] Ha pasado los agentes de revisión y se ha resuelto lo que señalaron  
- [ ] Cuenta con la aprobación de la tech lead en la PR  
- [ ] La documentación afectada está actualizada, incluido un ADR si hubo una decisión de arquitectura

## Seguimiento y dudas

Tenemos una mentoría semanal online entre la tech lead y el equipo, y Slack para las dudas del día a día. Ninguna pregunta está de más: si algo de esta guía no queda claro, es la guía la que hay que mejorar.
