# Navegación y autorización futura

El selector `Sin sesión / USER / ADMIN` existe únicamente para revisar visualmente el frontend. Vive en memoria, se reinicia al recargar y no concede permisos. Ocultar enlaces en JavaScript tampoco constituye protección.

## Alcance público actual

Inicio, Explorar, Perdidos, Encontrados, Adopciones, Fundaciones, perfiles públicos de fundación y animales, Poco comunes, Información y cuidados, Nuestro trabajo y Veterinarias son rutas públicas.

Perfil, Publicaciones, Casos, Mis solicitudes de adopción, Mis apadrinamientos, Notificaciones y Configuración son privadas visualmente. Un visitante es enviado al login. El enlace al panel administrativo solo aparece con `ADMIN`.

## Cuenta, organización y permisos

- USER representa una cuenta o persona.
- Foundation representa una organización.
- Una Foundation no es un USER renombrado.
- No existe `role: FOUNDATION`.
- Varios usuarios podrán gestionar una organización mediante permisos futuros.
- Animal representa un individuo bajo cuidado; Species describe información científica general.

## Reglas que deberá imponer FastAPI

- Toda cuenta creada mediante registro público obtiene `role = USER`.
- El administrador principal se crea mediante configuración segura.
- El perfil nunca acepta `role` como campo editable.
- `GET /admin` y `/api/v1/admin/*` requieren sesión válida y `role == ADMIN`.
- USER recibe `403 Forbidden` al invocar endpoints administrativos.
- Gestionar una fundación requerirá una relación de permisos entre USER y Foundation.
- Verificar, rechazar o suspender fundaciones requerirá ADMIN.
- Crear o editar animales requerirá permiso sobre la Foundation responsable.
- Crear un apadrinamiento requerirá sesión, consentimiento y validaciones reales.
- El backend será la autoridad aunque se modifique DOM, URL o JavaScript.

La interfaz `/admin/`, los estados de verificación y el apadrinamiento son demostraciones sin seguridad, persistencia ni transacciones.
