# 📒 Bitácora de Desarrollo - Ahorros Familiares

Este documento contiene el historial completo de cambios, la arquitectura, la estructura de la base de datos y el estado actual de la aplicación **Ahorros Familiares** para mantener la continuidad en futuras sesiones de desarrollo.

---

## 🚀 Estado Actual de la Aplicación

| Propiedad | Detalle |
| :--- | :--- |
| **URL de Producción** | [https://emontero-ops.github.io/test-repo/](https://emontero-ops.github.io/test-repo/) |
| **Versión Actual** | `1.5.0` (Sincronizada dinámicamente con `package.json`) |
| **Repositorio** | `emontero-ops/test-repo` (GitHub Pages activo) |
| **Backend / DB** | Supabase (Autenticación y Base de Datos Postgres) |
| **Diseño / Estética** | Minimalismo Técnico Premium con detalles artesanales (Paleta oscura, acentos dorados `#d4af37`, tipografía premium y OKLCH) |

---

## 🛠️ Arquitectura y Tecnologías

*   **Frontend:** React (v18+) + Vite (v8+) + React Router (v6)
*   **Estilos:** CSS nativo premium utilizando variables de diseño modernas.
*   **Base de Datos y Autenticación:** Supabase JS Client (`@supabase/supabase-js`)
*   **Despliegue:** `gh-pages` para publicación automatizada de la carpeta `dist` en GitHub.

---

## 📦 Estructura de la Base de Datos (Supabase)

### 1. Tabla `profiles`
Almacena la información de perfil adicional de los usuarios registrados.
*   `id` (uuid, PK): ID del usuario correspondiente a `auth.users`.
*   `name` (text): Nombre completo.
*   `role` (text): Rol del usuario (`admin` o `member`).
*   `phone` (text, opcional): Teléfono.
*   `birthDate` (date, opcional): Fecha de nacimiento.
*   `address` (text, opcional): Dirección residencial.
*   `occupation` (text, opcional): Ocupación profesional.

### 2. Tabla `transactions`
Registra todos los movimientos financieros familiares.
*   `id` (uuid/int, PK): ID único.
*   `user_id` (uuid, FK): ID del usuario ejecutor.
*   `user_name` (text): Nombre del usuario en el momento de la transacción.
*   `amount` (numeric): Monto de la transacción (los retiros se registran como valores positivos o negativos según la lógica de cálculo).
*   `type` (text): Tipo de movimiento (`deposit`, `withdrawal`, `loan_received`, `loan_given`).
*   `description` (text): Detalle o motivo.
*   `created_at` (timestamp): Fecha y hora del registro.

---

## 📝 Historial Completo de Cambios

### Fase 1: Inicialización y Autenticación Basal
*   **Configuración inicial:** Creación del proyecto React con Vite.
*   **Integración de Supabase:** Configuración de `supabaseClient.js`.
*   **Flujo de Registro/Acceso:** Desactivación de la confirmación por correo electrónico en Supabase para permitir acceso directo tras registrarse.
*   **Corrección de Referencias:** Solucionado el error `user is not defined` en el login mediante la correcta desestructuración de la sesión.

### Fase 2: Control Financiero y Roles
*   **Restricción de Visualización (Seguridad de Roles):**
    *   Los administradores (`admin`) pueden ver el total ahorrado acumulado de toda la familia y las métricas grupales.
    *   Los miembros (`member`) solo pueden visualizar su ahorro neto individual y deudas personales en `SavingsDisplay.jsx`.
*   **Cálculo de Balance Corregido (`Dashboard.jsx`):**
    *   *Antes:* Los préstamos recibidos aumentaban incorrectamente el ahorro disponible.
    *   *Ahora:* Los préstamos recibidos incrementan únicamente las deudas del usuario. El ahorro neto se calcula restando la deuda del ahorro base (`ahorro individual - deudas`). El total familiar suma únicamente los ahorros netos de todos los usuarios.
*   **Módulo de Préstamos Automáticos (`TransactionForm.jsx`):**
    *   Si un miembro intenta retirar un monto superior a su ahorro disponible, el sistema sugiere automáticamente procesar la diferencia como un "Préstamo".
    *   Se distribuye el préstamo entre los prestamistas con fondos y se registran las transacciones de forma segura e independiente en Supabase.
    *   Se corrigieron caracteres de escape (`\n` corruptos) y se añadió la propiedad `user_name` requerida en la inserción de transacciones de préstamo para evitar fallos silenciosos.

### Fase 3: UX, Redirecciones y SPA GitHub Pages (Últimos Cambios)
*   **Versión Dinámica:** Vinculación de `VITE_APP_VERSION` en `vite.config.js` para extraer de manera automatizada la versión real desde `package.json` y mostrarla en la esquina inferior derecha.
*   **Pantalla de Carga Fluida (Spinner):** Implementación de un spinner con una estética oscura premium para evitar saltos o pantallas en blanco prolongadas mientras se valida la sesión.
*   **Resolución de Errores 404 al Refrescar:** Automatización en `package.json` para clonar el build como `404.html` y evitar errores de ruta en GitHub Pages.
*   **Preservación de Subrutas en Refresh:**
    *   *Problema:* Al hacer F5 en `/profile` o `/goals`, el navegador cargaba el `404.html` por defecto, el cual redirigía a la raíz (`/`) y forzaba el redireccionamiento al `/dashboard`, perdiendo la ruta original del usuario.
    *   *Solución:* Se reescribió `public/404.html` para guardar la ruta original como parámetro de consulta (ej. `?p=/profile`).
    *   *Sincronización:* `App.jsx` lee estos parámetros al inicializarse y redirige de manera transparente al usuario a la subruta exacta en la que estaba antes del refresh, manteniendo su sesión activa de forma impecable.
    *   *Carga Defensiva:* Se implementó un timeout de `1500ms` en la consulta del perfil en Supabase para evitar bloqueos infinitos de carga ante caídas de red o demoras del servidor.

### Fase 4: Rediseño Premium del Componente de Login
*   **Actualización del Componente `Login.jsx`:**
    *   Se actualizó el diseño del componente de login para que se alinee con la estética de "Minimalismo Técnico Premium" de la aplicación.
    *   Se utilizó un contenedor con fondo oscuro (`--background`) y bordes redondeados.
    *   Los campos de entrada (`input`) y selects fueron estilizados con un borde sutil (`--border`), fondo de superficie (`--background`), texto claro (`--text`) y enfoque en color de acento (`--accent`).
    *   Los botones fueron diseñados con un estilo premium:
        *   El botón principal (Iniciar/Crear cuenta) usa un gradiente de color de acento a un tono púrpura (`linear-gradient(135deg, var(--accent) 0%, #764ba2 100%)`) con efecto hover y press.
        *   El botón secundario (alternar entre login y registro) usa un estilo de contorno que se rellena al hover.
    *   Se mejoró la tipografía y el espaciado para una composición limpia y legible, utilizando las variables de tamaño y peso de fuente definidas en `index.css`.
    *   Se mantuvo la lógica de autenticación y registro con Supabase, así como el manejo de estados de carga, error y mensaje.
|*   **Despliegue:** Los cambios fueron compilados y desplegados en GitHub Pages mediante `npm run build` y `npm run deploy`.
|*   **Seguridad:** Se eliminó la opción pública de registro como "admin" en el formulario de creación de cuenta para evitar accesos no autorizados. Ahora todos los nuevos usuarios se registran por defecto con el rol "member". Los roles de administrador deben ser asignados manualmente por un administrador existente directamente en la base de datos de Supabase.

---

## 📋 Lista de Tareas Pendientes (Próximas Sesiones)

- [ ] **Migración de Metas a Supabase:** Actualmente las metas de ahorro en `SavingsGoals.jsx` se guardan en el `localStorage` del navegador. Deberían migrarse a una tabla `goals` en Supabase para que sean persistentes entre diferentes dispositivos.
- [ ] **Auditoría de Políticas de Seguridad (RLS):** Validar y ajustar las políticas RLS de las tablas de Supabase para asegurar que un usuario `member` no pueda alterar datos de otros miembros mediante llamadas API directas.
- [ ] **Notificaciones en Tiempo Real:** Configurar canales de tiempo real (Realtime) de Supabase para que, si un usuario ingresa un depósito o préstamo, se actualice la pantalla de los demás miembros de manera instantánea sin requerir refrescar.
- [ ] **Exportación de Reportes:** Permitir la descarga de un reporte en PDF o CSV con el historial de transacciones filtrado.
