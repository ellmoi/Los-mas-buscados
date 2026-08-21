# Navegación y autorización futura

El selector `Sin sesión / USER / ADMIN` existe únicamente para revisar visualmente el frontend. Vive en memoria, se reinicia al recargar y no concede permisos. Ocultar enlaces en JavaScript tampoco constituye protección.

## Alcance público actual

Las rutas de Inicio, Explorar, Perdidos, Encontrados, Adopciones, Poco comunes, Información y cuidados, Nuestro trabajo y Veterinarias son públicas en el prototipo. Las rutas `/poco-comunes`, `/informacion` y `/nuestro-trabajo` no dependen del rol demo.

Las rutas de Perfil, Publicaciones, Casos, Notificaciones y Configuración continúan siendo privadas visualmente. Un visitante es enviado al inicio de sesión. El enlace al panel administrativo solo se muestra al seleccionar `ADMIN`.

## Reglas que deberá imponer FastAPI

- Toda cuenta creada mediante el registro público obtiene `role = USER`.
- El administrador principal se crea mediante un script o configuración segura del backend.
- El perfil y sus endpoints nunca aceptan `role` como campo editable.
- No existirán acciones de “registrarse” o “convertirse” en administrador.
- `GET /admin` y cada endpoint bajo `/api/v1/admin/*` requieren una sesión válida y `role == ADMIN`.
- Un USER recibe `403 Forbidden` al invocar cualquier endpoint administrativo.
- La gestión futura de categorías, fichas, artículos, proyectos oficiales y relaciones será exclusiva de ADMIN.
- El backend es la autoridad aunque se modifique el DOM, la URL, JavaScript o una petición.
- Se evaluará MFA para la cuenta ADMIN antes de producción.

La interfaz `/admin/` actual es un prototipo visual y no está protegida. `useDemoData` permanece activo y ninguna navegación de esta fase equivale a autorización real.
