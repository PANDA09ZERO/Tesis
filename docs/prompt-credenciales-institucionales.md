# Prompt: credenciales institucionales automáticas

```text
Quiero implementar en este sistema la creación automática de credenciales para los usuarios nuevos: alumnos, profesores, apoderados y administradores.

Antes de cambiar código, inspecciona la estructura actual del frontend y backend, el modelo de usuarios, las reglas de autenticación, los roles, las validaciones y las pruebas existentes. Reutiliza los patrones actuales y no rompas el inicio de sesión ni las cuentas ya registradas.

Objetivo:
- Cuando se cree un usuario, generar automáticamente su identificador de acceso con formato de correo institucional, por ejemplo: 15543926@cienciaseingenieria.edu.
- Usar un identificador de acceso corto y legible basado en nombre y apellido, por ejemplo `ana.mendoza@cienciaseingenieria.edu`.
- Normalizar nombres y apellidos (tildes, espacios, mayúsculas y caracteres no válidos), comprobar la unicidad y añadir un sufijo numérico solo cuando ya exista una cuenta con ese identificador.
- Mantener el código de alumno como identificador académico independiente del usuario de acceso.
- Mantener la compatibilidad con los usuarios existentes. No cambiar sus credenciales sin un proceso explícito de migración.

Seguridad de la contraseña:
-usar la fecha de nacimiento como contraseña, que luego el usuario puede cambiar al iniciar sesion.
- Al crear la cuenta, generar un mecanismo de activación seguro: preferentemente un enlace de un solo uso con vencimiento.
- Guardar únicamente hashes seguros de contraseñas y tokens; nunca guardar ni registrar contraseñas en texto plano.
- No mostrar contraseñas en respuestas de API, logs ni pantallas administrativas. Si se usa una contraseña temporal, mostrarla una sola vez únicamente a una persona autorizada.
- Implementar el cambio obligatorio de contraseña y permitir que cada usuario cambie su propia contraseña desde su cuenta.
- Conservar las protecciones actuales de autenticación, permisos, validación y limitación de intentos.

Interfaz y notificaciones:
- En el formulario de creación, mostrar el identificador generado y aclarar que es el usuario para ingresar al sistema.
- No afirmar que se creó una bandeja de correo real. La creación de una cuenta de correo electrónico requiere un proveedor externo y configuración del dominio.
- Si el proyecto ya tiene un servicio de correo configurado, enviar una invitación segura al usuario; si no lo tiene, dejar el flujo preparado sin agregar credenciales SMTP ni secretos al código.
- Mostrar errores accionables cuando falten datos necesarios o el identificador ya exista.

Pruebas:
- Agregar o actualizar pruebas para creación por cada rol, generación y normalización del identificador, unicidad, conflictos, activación/cambio obligatorio de contraseña, permisos y compatibilidad con cuentas existentes.
- No usar datos personales reales en las pruebas.
- Ejecutar las pruebas relevantes y la compilación del proyecto.

Haz cambios mínimos pero completos y documenta cualquier configuración necesaria para producción, especialmente dominio y proveedor de correo. Al final, resume qué quedó implementado, qué pruebas pasaron y qué falta configurar para enviar correos reales.
```
