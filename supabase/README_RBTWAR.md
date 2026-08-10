# Backend de analítica RBTwar

Este bloque conecta `src/analytics-v29.js` con Supabase y alimenta `admin.html`.

## Componentes

- `migrations/20260810_rbtwar_analytics.sql`: tabla de eventos, índices, RLS, administradores y RPC de métricas.
- `functions/rbtwar-analytics/index.ts`: endpoint público de recepción. Valida tipos, limita lotes y hace deduplicación por `event_id`.
- `functions/rbtwar-admin/index.ts`: endpoint privado para el dashboard. Requiere usuario autenticado y registrado en `rbtwar_admin_users`.
- `/admin.html`: dashboard. Mientras el backend no esté conectado, muestra los datos locales del mismo dispositivo.

## Seguridad

La aplicación nunca recibe la `service_role`. Los jugadores solo llaman a la función de ingestión, que acepta un conjunto cerrado de eventos y no permite leer la base. La tabla tiene RLS y acceso directo revocado para `anon` y `authenticated`.

El endpoint de administrador exige JWT válido de Supabase Auth y además verifica que el `user_id` esté en `rbtwar_admin_users`. El token del administrador se guarda únicamente en `sessionStorage` del dashboard.

## Activación

1. Crear un proyecto Supabase dedicado a RBTwar.
2. Aplicar la migración.
3. Desplegar `rbtwar-analytics` con verificación JWT desactivada; la función hace su propia validación estricta del payload.
4. Desplegar `rbtwar-admin` con verificación JWT activada.
5. Crear el usuario administrador en Supabase Auth y añadir su UUID a `rbtwar_admin_users`.
6. Configurar en el juego la URL `/functions/v1/rbtwar-analytics`.
7. En `admin.html`, conectar `/functions/v1/rbtwar-admin` y usar la sesión/JWT del administrador.

## Métricas disponibles

Instalaciones anónimas, sesiones, tiempo activo promedio, nivel máximo, partidas iniciadas, victorias, derrotas, abandonos, mejoras, embudo por nivel, tasa de éxito y duración por nivel, ofertas de anuncios, anuncios iniciados/completados y recompensas entregadas.
