# Tests de integración con PostgreSQL

Los tests de integración del servidor usan PostgreSQL real, no una base de datos en memoria. Así comprobamos el comportamiento con la misma tecnología que utiliza la aplicación.

## Antes de empezar

- Asegúrate de que PostgreSQL está arrancado y de que la configuración local del servidor apunta a tu base `peephole`.
- No ejecutes tests contra la base de Railway ni otra base compartida: al iniciar la aplicación, Flyway puede aplicar migraciones a la base configurada.
- No compartas ni subas el archivo local `server/.env` ni sus valores.

## Crear un test de integración

1. Crea el test bajo `server/src/test/java/`, en el paquete correspondiente a la funcionalidad.
2. Usa `@SpringBootTest` para cargar la aplicación y `@AutoConfigureMockMvc` si necesitas enviar peticiones HTTP sin arrancar un servidor aparte.
3. Añade `@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)` para evitar que Spring sustituya la base configurada por una base embebida.
4. Prueba el comportamiento observable del endpoint y, cuando corresponda, prepara y comprueba los datos de la base de datos.
5. Ejecuta el test desde `server/`:

   ```powershell
   .\mvnw.cmd test "-Dtest=NombreDelTest"
   ```

Por ejemplo, el test de salud comprueba la respuesta HTTP usando la conexión a PostgreSQL configurada:

```java
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void reportsWhenDatabaseIsResponding() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.database").value("UP"));
    }
}
```

Adapta el paquete, el nombre de la clase, la ruta y las comprobaciones al endpoint de tu funcionalidad. El ejemplo muestra el patrón de integración; no copies un endpoint de prueba al código de producción.

## Comprobar que se usa PostgreSQL real

- No añadas H2 ni otra base en memoria para sustituir PostgreSQL.
- Comprueba que el test tiene `replace = AutoConfigureTestDatabase.Replace.NONE`.
- Verifica que la configuración activa apunta a tu PostgreSQL local.
- Si la aplicación no puede conectarse, resuelve primero ese problema; no cambies el test para que use una base en memoria.

Para ejecutar todos los tests y comprobar también el formato y la compilación, desde `server/` ejecuta:

```powershell
.\mvnw.cmd verify
```
