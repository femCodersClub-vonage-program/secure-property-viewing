# Peephole · Secure Property Viewing

🇬🇧 [Read in English](README.md)

[![Estado del CI en dev](https://img.shields.io/github/actions/workflow/status/femCodersClub-vonage-program/secure-property-viewing/ci.yml?branch=dev&label=CI%20dev&logo=githubactions&logoColor=white&labelColor=1f2937&style=flat-square)](https://github.com/femCodersClub-vonage-program/secure-property-viewing/actions/workflows/ci.yml?query=branch%3Adev)
[![Estado del CI en main](https://img.shields.io/github/actions/workflow/status/femCodersClub-vonage-program/secure-property-viewing/ci.yml?branch=main&label=CI%20main&logo=githubactions&logoColor=white&labelColor=1f2937&style=flat-square)](https://github.com/femCodersClub-vonage-program/secure-property-viewing/actions/workflows/ci.yml?query=branch%3Amain)
[![Licencia MIT](https://img.shields.io/badge/license-MIT-1f2937?style=flat-square)](LICENSE)

Plataforma web de visitas de pisos en remoto con verificación antiestafa, desarrollada con las APIs de Vonage dentro del programa de proyectos y mentorías de **FemCoders Club con Vonage**.

> Estado: borrador inicial. Las APIs de Vonage están decididas y el stack tecnológico está decidido en el [ADR 0001](docs/adr/0001-tech-stack.md).

## Índice

1. [Sobre el proyecto](#sobre-el-proyecto)  
2. [Alcance del MVP](#alcance-del-mvp)  
3. [Qué resuelve y cómo integramos Vonage](#qué-resuelve-y-cómo-integramos-vonage)  
4. [Stack tecnológico](#stack-tecnológico)  
5. [Cómo trabajamos](#cómo-trabajamos)  
6. [Documentación](#documentación)  
7. [Equipo](#equipo)  
8. [Seguridad y datos personales](#seguridad-y-datos-personales)  
9. [Código de conducta](#código-de-conducta)  
10. [Licencia](#licencia)

## Sobre el proyecto

Buscar piso de alquiler se ha convertido en un terreno fértil para las estafas: anuncios con fotos robadas, agencias suplantadas, señales pagadas por adelantado por viviendas que no existen y visitas en las que quien enseña el piso no tiene relación con él.

Peephole parte de una idea sencilla: **nadie debería adelantar dinero sin haber comprobado antes que el piso existe y que quien lo anuncia es quien dice ser**. Para ello, la plataforma verifica el teléfono de cada parte, permite visitar la vivienda en directo por vídeo y mantiene toda la comunicación dentro de su propio canal.

El escenario es una agencia inmobiliaria en Cataluña, que publica inmuebles, revisa las solicitudes de propietarias y propietarios y atiende las visitas.

## Alcance del MVP

El programa dura seis semanas, así que el MVP se centra en lo que da sentido al proyecto: comprobar que el piso existe y que cada parte es quien dice ser.

**Entra en el MVP**

- Los tres [recorridos de la aplicación](docs/user-journeys.md): visitante, propietaria y panel de la agencia  
- Catálogo de inmuebles en venta y en alquiler, cargado con datos de ejemplo (seed)  
- Verificación del teléfono mediante OTP por SMS  
- Visita guiada por vídeo one-to-one y videollamada entre la propietaria y la agencia  
- Visita multiparte, para que pueda sumarse una segunda persona interesada o la propietaria  
- Confirmaciones, recordatorios y avisos por SMS  
- Gestión de solicitudes y calendario de visitas en el panel de la agencia

**Queda como evolución**

- Silent Authentication  
- Notificaciones por WhatsApp Business  
- Firma o ratificación por vídeo con la gestora y verificación en dos pasos de todas las partes  
- Grabación de las sesiones de vídeo  
- Pagos dentro de la plataforma  
- Integración con portales inmobiliarios reales

## Qué resuelve y cómo integramos Vonage

[![Vonage Verify API](https://img.shields.io/badge/Verify%20API-1f2937?logo=vonage&logoColor=white&style=for-the-badge)](docs/vonage.md#verify-api)
[![Vonage Video API](https://img.shields.io/badge/Video%20API-1f2937?logo=vonage&logoColor=white&style=for-the-badge)](docs/vonage.md#video-api)
[![Vonage Messages API](https://img.shields.io/badge/Messages%20API-1f2937?logo=vonage&logoColor=white&style=for-the-badge)](docs/vonage.md#messages-api)

| Vector de fraude | Riesgo | Módulo de Vonage que lo mitiga |
| :---- | :---- | :---- |
| **Anuncio fantasma o identidad falsa**: anunciante con número desechable o bot | Anunciante no verificado: no se sabe si la persona es real o usa un número temporal | **Verify API**: OTP por SMS para verificar el teléfono del anunciante, con Silent Authentication como evolución |
| **Piso inexistente o fotos robadas**: la vivienda no corresponde con el anuncio | Vivienda mal representada: las fotos son falsas o de otra propiedad | **Video API**: visita interactiva en directo para comprobar que la vivienda existe y coincide con el anuncio |
| **Phishing o derivación a canales externos**: enlaces trampa o cobros por canales opacos | Enlaces y pagos fraudulentos fuera de los canales oficiales | **Messages API**: notificaciones enviadas siempre desde el canal oficial de la plataforma, para que la comunicación sea segura y trazable |
| **Venta múltiple o arras ficticias** *(evolución)*: falta de trazabilidad y dobles reservas | La misma vivienda se reserva o se vende a varias personas, con pagos iniciales sin garantías | **Video API + Verify API**: firma o ratificación con la gestora por vídeo y verificación en dos pasos de todas las partes antes de cualquier orden de pago |

Cómo usamos cada API, y los SDK, el CLI y los servidores MCP de Vonage que apoyan el desarrollo, se describe en [`docs/vonage.md`](docs/vonage.md) (en inglés).

## Stack tecnológico

![React](https://img.shields.io/badge/React-1f2937?logo=react&logoColor=white&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-1f2937?logo=typescript&logoColor=white&style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-1f2937?logo=vite&logoColor=white&style=for-the-badge)
![React Router](https://img.shields.io/badge/React%20Router-1f2937?logo=reactrouter&logoColor=white&style=for-the-badge)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-1f2937?logo=tailwindcss&logoColor=white&style=for-the-badge)
![Vitest](https://img.shields.io/badge/Vitest-1f2937?logo=vitest&logoColor=white&style=for-the-badge)
![Java](https://img.shields.io/badge/Java-1f2937?logo=openjdk&logoColor=white&style=for-the-badge)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-1f2937?logo=springboot&logoColor=white&style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-1f2937?logo=postgresql&logoColor=white&style=for-the-badge)
![Flyway](https://img.shields.io/badge/Flyway-1f2937?logo=flyway&logoColor=white&style=for-the-badge)
![Railway](https://img.shields.io/badge/Railway-1f2937?logo=railway&logoColor=white&style=for-the-badge)

| Capa | Tecnología |
| :---- | :---- |
| `client/` | React 19, TypeScript 7, Vite 8, React Router 8 y Tailwind CSS 4, con oxlint, Prettier y Vitest |
| `server/` | Java 21, Spring Boot 4.1 y Maven, con Spotless |
| Base de datos | PostgreSQL 17 con migraciones de Flyway |
| Comunicaciones | Vonage, mediante el Java Server SDK y el Video Client SDK |
| Despliegue | Railway, con el cliente, el servidor y PostgreSQL como servicios separados |

Los motivos, las alternativas descartadas y lo que se sacrifica están en el [ADR 0001](docs/adr/0001-tech-stack.md), y el despliegue en el [ADR 0002](docs/adr/0002-deployment-railway.md) (los dos en inglés). La [arquitectura](docs/architecture/README.md) de alto nivel es independiente del stack.

## Cómo trabajamos

[![Tablero del GitHub Project](https://img.shields.io/badge/GitHub%20Project-board-1f2937?logo=github&logoColor=white&style=flat-square)](https://github.com/orgs/femCodersClub-vonage-program/projects/3)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-1f2937?logo=conventionalcommits&logoColor=white&style=flat-square)](https://www.conventionalcommits.org/)

Trabajamos con Spec-Driven Development, registramos las decisiones técnicas como ADR, gestionamos las tareas en un [GitHub Project](https://github.com/orgs/femCodersClub-vonage-program/projects/3) e integramos cada cambio mediante pull requests revisadas contra `dev`. La IA forma parte del trabajo diario, con su propia configuración y sus reglas versionadas en el repositorio.

El flujo completo, la estructura del repositorio, la estrategia de testing, cómo usamos la IA y la Definition of Done están en [`CONTRIBUTING.es.md`](CONTRIBUTING.es.md).

## Documentación

Los documentos de `docs/` están en inglés, siguiendo las convenciones del proyecto, con dos excepciones en español: la guía de puesta en marcha, que tiene las dos versiones, y las guías del equipo de `docs/guides/`.

| Documento | Contenido |
| :---- | :---- |
| [`docs/setup.es.md`](docs/setup.es.md) | Cómo poner en marcha el proyecto en tu ordenador, paso a paso |
| [`docs/user-journeys.md`](docs/user-journeys.md) | Los recorridos de visitante, propietaria y panel de la agencia, paso a paso |
| [`docs/vonage.md`](docs/vonage.md) | APIs y herramientas de Vonage para el desarrollo |
| [`docs/architecture/`](docs/architecture/README.md) | Diagramas de arquitectura, flujo principal y principios de diseño |
| [`docs/adr/`](docs/adr/) | Decisiones de arquitectura del proyecto |
| [`docs/guides/`](docs/guides/README.md) | Guías breves sobre problemas con los que se encuentra todo el equipo, escritas en español |
| [`docs/presentations/`](docs/presentations/) | Presentaciones del proyecto, como la de la sesión de mentoría [«¿Anuncio real o estafa?»](docs/presentations/real-listing-or-scam.pdf) (en inglés) |
| [`CONTRIBUTING.es.md`](CONTRIBUTING.es.md) | Flujo de trabajo, convenciones, testing, uso de la IA y estructura del repositorio |

## Equipo

<table>
<tr>
<td align="center" width="120">
<a href="https://github.com/Irina-Ichim"><img src="https://github.com/Irina-Ichim.png" width="96" alt="Irina Ichim" /></a>
</td>
<td>
<strong>Irina Ichim</strong><br />
Tech lead y mentora<br />
<a href="https://www.linkedin.com/in/irina-ichim-desarrolladora/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white" alt="LinkedIn de Irina Ichim" /></a>
<a href="https://github.com/Irina-Ichim"><img src="https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white" alt="GitHub de Irina Ichim" /></a>
</td>
<td align="center" width="120">
<a href="https://github.com/Nelicah"><img src="https://github.com/Nelicah.png" width="96" alt="Cande Zamora" /></a>
</td>
<td>
<strong>Cande Zamora</strong><br />
Participante<br />
<a href="https://www.linkedin.com/in/cande-zamora-125301349/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white" alt="LinkedIn de Cande Zamora" /></a>
<a href="https://github.com/Nelicah"><img src="https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white" alt="GitHub de Cande Zamora" /></a>
</td>
<td align="center" width="120">
<a href="https://github.com/may-leth"><img src="https://github.com/may-leth.png" width="96" alt="Mayleth Carrascal" /></a>
</td>
<td>
<strong>Mayleth Carrascal</strong><br />
Participante<br />
<a href="https://www.linkedin.com/in/maylethcarrascal/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white" alt="LinkedIn de Mayleth Carrascal" /></a>
<a href="https://github.com/may-leth"><img src="https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white" alt="GitHub de Mayleth Carrascal" /></a>
</td>
</tr>
<tr>
<td align="center" width="120">
<a href="https://github.com/Kat-lev"><img src="https://github.com/Kat-lev.png" width="96" alt="Kat Leverton" /></a>
</td>
<td>
<strong>Kat Leverton</strong><br />
Participante<br />
<a href="https://www.linkedin.com/in/kat-leverton/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white" alt="LinkedIn de Kat Leverton" /></a>
<a href="https://github.com/Kat-lev"><img src="https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white" alt="GitHub de Kat Leverton" /></a>
</td>
<td align="center" width="120">
<img src="https://github.com/ghost.png" width="96" alt="" />
</td>
<td>
<strong><em>Por confirmar</em></strong><br />
Participante
</td>
<td align="center" width="120">
<img src="https://github.com/ghost.png" width="96" alt="" />
</td>
<td>
<strong><em>Por confirmar</em></strong><br />
Participante
</td>
</tr>
</table>

Proyecto desarrollado en el programa de **FemCoders Club** con el apoyo de **Vonage**, que aporta los créditos de API, un workshop técnico y el acompañamiento de su equipo.

## Seguridad y datos personales

La aplicación trabaja con números de teléfono, así que aunque sea un proyecto de portfolio lo tratamos con el mismo cuidado que uno real:

- Durante el desarrollo solo se usan **datos de prueba**: teléfonos del propio equipo con su consentimiento o los números de prueba de Vonage  
- Las credenciales nunca se suben al repositorio: `.env` está en `.gitignore` y `.env.example` solo recoge los nombres de las variables, con valores de ejemplo y sin pistas como hosts, usuarios o nombres de bases de datos  
- Los archivos sensibles quedan excluidos del alcance de los asistentes de IA en `.claude/settings.json`  
- Si encuentras una vulnerabilidad, la forma de reportarla está en [`SECURITY.md`](SECURITY.md)

## Código de conducta

Este proyecto sigue el [código de conducta de FemCoders Club](https://www.femcodersclub.com/codigo-de-conducta), que recoge las normas de convivencia de la comunidad en eventos, Slack, redes y programas, incluidos los proyectos en grupo.

## Licencia

Este proyecto se distribuye bajo la licencia [MIT](LICENSE).
