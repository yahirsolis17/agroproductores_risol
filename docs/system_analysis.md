# Análisis del Sistema: Agroproductores Risol

## 1. Resumen Ejecutivo
El sistema **Agroproductores Risol** es una plataforma ERP (Planificación de Recursos Empresariales) basada en web, diseñada para la gestión agrícola, enfocándose específicamente en la producción y empaque de mango. El sistema se divide en dos componentes principales:
- **Backend**: Una robusta aplicación Django REST Framework que maneja lógica de negocio compleja para huertas, logística de bodega y administración de usuarios.
- **Frontend**: Una SPA (Single Page Application) moderna en React usando Vite, encargada de la interfaz de usuario con control de acceso basado en roles.

## 2. Pila Tecnológica (Tech Stack)

### Backend
- **Framework**: Django 5.0.6
- **API**: Django Rest Framework (DRF) 3.15.2
- **Autenticación**: JWT (JSON Web Tokens) vía `djangorestframework-simplejwt`.
- **Base de Datos**: MySQL/MariaDB (vía `mysqlclient`).
- **Documentación**: OpenAPI 3.0 vía `drf-spectacular`.
- **Librerías Clave**:
    - `pandas` / `numpy` / `openpyxl`: Para procesamiento de datos y reportes.
    - `django-cors-headers`: Para manejo de CORS (Intercambio de recursos de origen cruzado).

### Frontend
- **Framework**: React 18 (usando Vite 6.2.0 como herramienta de construcción).
- **Lenguaje**: TypeScript.
- **Gestión de Estado**:
    - **Global**: Redux Toolkit (estado de autenticación, preferencias globales).
    - **Estado del Servidor**: TanStack Query (React Query) v5 (obtención de datos, caché).
- **Librería UI**: Material UI v7 + Tailwind CSS v3.
- **Enrutamiento**: React Router DOM v7.
- **Formularios**: Formik + Yup.
- **Iconos**: Lucide React, React Icons, MUI Icons.

## 3. Resumen de Arquitectura

El sistema sigue una estructura estilo monorepo pero se despliega como servicios separados (El Frontend se compila a archivos estáticos, el Backend corre como servidor API).

### Estructura Backend (`/backend`)
Organizado por aplicaciones (apps) orientadas al dominio:
1.  **gestion_usuarios**: Maneja autenticación (Modelo de Usuario Personalizado), roles (`admin`, `usuario`) y seguridad (throttling, permisos).
2.  **gestion_huerta**: Gestiona la producción agrícola.
    -   **Modelos**: `Propietario`, `Huerta` (propia), `HuertaRentada`, `Temporada`, `Cosecha`, `Inversiones`, `Ventas`.
    -   **Lógica Clave**: Seguimiento estacional por huerta, cálculo de ganancias/pérdidas por cosecha.
3.  **gestion_bodega**: Maneja logística de bodega y empaque.
    -   **Modelos**: `Bodega`, `TemporadaBodega`, `CierreSemanal` (bloqueos operativos semanales), `Recepcion` (entrada de campo), `Clasificacion` (empaque), `InventarioPlastico`, `CamionSalida`.
    -   **Lógica Clave**: Ciclos estrictos de cierre semanal (`CierreSemanal`), seguimiento de inventario (Cajas Plástico vs Madera) y validación jerárquica (Temporada -> Semana -> Recepción -> Clasificación).

### Estructura Frontend (`/frontend`)
Organizado en módulos que coinciden con las apps del backend:
-   **src/global**: Utilidades centrales compartidas (store Redux, componentes genéricos, router).
-   **src/modules/gestion_usuarios**: Páginas de Auth (Login, Perfil), Gestión de usuarios.
-   **src/modules/gestion_huerta**: Páginas para Huertas, Temporadas, Cosechas y Reportes Financieros.
-   **src/modules/gestion_bodega**: Tablero de bodega, inventario, logística y flujos de empaque.

## 4. Puntos Destacados del Esquema de Base de Datos

### Usuarios y Seguridad
-   **Modelo de Usuario Personalizado**: Usa `telefono` como identificador único.
-   **Borrado Lógico (Soft Deletion)**: Todos los modelos principales heredan la lógica `is_active` / `archivado_en` para un borrado seguro.

### Huerta
-   **Jerarquía**: `Propietario` -> `Huerta`/`HuertaRentada` -> `Temporada` -> `Cosecha`.
-   **Finanzas**: `InversionesHuerta` (Costos) vs `Venta` (Ingresos). Propiedades calculadas en `Cosecha` proveen el Estado de Resultados (P&L) en tiempo real.

### Bodega
-   **Mecanismo de Bloqueo**: `CierreSemanal` asegura la integridad de los datos bloqueando semanas de operación. No se permiten ediciones retroactivas en semanas cerradas.
-   **Trazabilidad**:
    -   `Recepcion` (Campo -> Bodega)
    -   `ClasificacionEmpaque` (Crudo -> Empacado) valida contra cajas de campo disponibles.
    -   `Pedido` -> `Surtido` -> `CamionSalida` (Empacado -> Cliente).

## 5. Seguridad y Permisos
-   **Auth JWT**: Tokens de acceso de corta duración (¿7 días? - revisar settings, parece largo) + Tokens de refresco.
-   **RBAC (Control de Acceso Basado en Roles)**: Rutas del frontend protegidas por `RoleGuard` (Admin vs Usuario).
-   **Seguridad API**:
    -   Throttling configurado para login (`20/min`) y acciones sensibles.
    -   CORS restringido a orígenes permitidos.

## 6. Recomendaciones
1.  **Despliegue**: No se encontró configuración de Docker. Se recomienda crear un `docker-compose.yml` para paridad en desarrollo local y facilitar el despliegue.
2.  **Configuración JWT**: `ACCESS_TOKEN_LIFETIME` está configurado a 7 días en `settings.py`. Considere reducir esto a minutos (ej. 15-60m) y confiar en la rotación del Refresh Token para mejor seguridad.
3.  **Estado Frontend**: Verificar si `Redux` es estrictamente necesario junto con `TanStack Query`. Gran parte del estado del servidor podría estar duplicado.
