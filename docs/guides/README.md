# Guías

Guías breves para el equipo sobre lo que nos encontramos todas. Cuando alguien resuelve un problema que también tendrán las demás, como un paso de configuración de Vonage, un doble de test complicado o una situación con Git, lo escribe aquí para que nadie tenga que resolverlo dos veces.

Esta carpeta es la excepción al idioma del repositorio: las guías se escriben solo en español.

Para poner en marcha el proyecto en tu ordenador, empieza por [`docs/setup.es.md`](../setup.es.md).

## Guías disponibles

| Guía | Para qué sirve |
| :---- | :---- |
| [Comandos del día a día](daily-commands.md) | Arrancar el servidor y el cliente, trabajar con Git y consultar la base de datos desde la terminal |
| [Migraciones con Flyway](flyway-migrations.md) | Crear tablas sin chocar con las demás y salir de los errores de Flyway |

## Cuándo añadir una guía

- Has dedicado tiempo a algo que no era evidente y las demás lo van a necesitar
- La misma pregunta ha salido más de una vez en Slack o en una mentoría
- El agente `docs-reviewer` ha sugerido una para tu cambio

Las decisiones no van aquí: van en un ADR en [`docs/adr/`](../adr/). Las guías explican el *cómo*; los ADR, el *porqué*.

## Cómo escribirla

- Un tema por archivo, con el nombre en inglés y en kebab-case, como `vonage-test-numbers.md`
- Empieza por el problema en una o dos frases, y después los pasos
- Solo en español, sin versión en inglés
- Sin credenciales, claves ni números de teléfono reales: usa los números de prueba de Vonage. Si una guía necesita una contraseña compartida, indica que está en la carpeta compartida del Drive del equipo, sin enlazarla

Las guías pasan por una pull request como cualquier otro cambio.
