# Agroproductores Risol — Presentación del Proyecto (archivo.md)

## 1. Resumen Ejecutivo
Agroproductores Risol es un sistema empresarial (full-stack) diseñado para operar el ciclo completo de una agroproductora de mango: desde el registro y administración de huertas, temporadas y cosechas, hasta la operación de bodega (recepciones, clasificaciones, inventarios, cierres semanales/temporada) y el cierre financiero (inversiones, ventas y reportes). Su propuesta de valor es eliminar operación manual dispersa (Excel, libretas, WhatsApp), consolidar el control operativo y asegurar trazabilidad con reglas de integridad estrictas.

El sistema fue construido con una filosofía “sin bifurcaciones”: contratos de respuesta canónicos, paginación y filtros desde backend, notificaciones desde backend, Redux como fuente única de estado en frontend, y auditoría de acciones para trazabilidad y seguridad.

## 2. Qué resuelve (Dolores y Resultados)
### 2.1 Problemas típicos que resuelve
- Información fragmentada: múltiples archivos y fuentes, sin un único estado “real”.
- Falta de trazabilidad: no se sabe quién cambió qué, cuándo y por qué.
- Pérdida de control de operación: registros duplicados, inconsistencias, decisiones tardías.
- Errores de operación por falta de reglas: eliminaciones riesgosas, cascadas rotas, ventas sin soporte, cosechas abiertas donde no deberían.
- Reportes lentos o inexistentes: datos no confiables para decisiones.

### 2.2 Resultados clave
- Control operativo end-to-end y trazabilidad real.
- Integridad de datos por reglas de negocio y validaciones consistentes.
- Operación sin “recargas”: UI reactiva y coherente con backend.
- Reportes en PDF/Excel (y expansión futura a analítica avanzada).
- Auditoría de acciones por usuario (historial).

## 3. Arquitectura General
### 3.1 Backend (Django + DRF)
- Django + Django REST Framework como base.
- Base de datos MySQL.
- Apps modulares:
  - `gestion_usuarios`: autenticación, permisos, auditoría, control de sesión.
  - `gestion_huerta`: propietarios, huertas propias/rentadas, temporadas, cosechas, inversiones, ventas, categorías, reportes.
  - `gestion_bodega`: tablero operativo por temporada, semanas, recepciones, empaques, inventarios, cierres y reportes.
  - `gestion_venta` (expansión o consolidación futura si aplica).
- Contrato canónico de respuesta mediante `NotificationHandler` global.
- Paginación canónica mediante `GenericPagination`.

### 3.2 Frontend (React + Vite + TypeScript)
- React + Vite + TypeScript.
- Redux Toolkit como capa única de estado y orquestación.
- Material UI como UI kit base (consistencia visual).
- Tailwind CSS (utilitario) para layout refinado donde convenga.
- Framer Motion para microinteracciones sutiles y transiciones.

## 4. Contratos Canónicos (Esenciales)
### 4.1 Respuesta canónica del backend
Todas las respuestas (salvo binarios como PDF/XLSX) deben mantener:
- `success`
- `message_key`
- `message`
- `data` (estructura por endpoint)
- `data.results` y `data.meta` en listados paginados

### 4.2 Paginación y filtros
- Paginación: siempre desde backend.
- Filtros: siempre desde backend.
- Frontend solo envía query params y renderiza `results/meta`.

### 4.3 Notificaciones
- El backend decide el mensaje mediante `message_key`.
- El frontend solo renderiza la notificación usando el motor centralizado (NotificationEngine).

### 4.4 Política UI-only transforms (Opción B)
Se permite `.filter/.sort/.slice` solo para presentación UI (menús, top-N, orden visual), y se prohíbe para manipular listados de negocio. La definición formal está en `docs/fuente_de_la_verdad.md`.

## 5. Módulos y Funcionalidades
### 5.1 Gestión de Usuarios (gestion_usuarios)
- Registro de usuarios por administrador (sistema cerrado).
- Login/logout con tokens y control de sesión.
- Roles (admin/usuario) y permisos por módulo/acción.
- Historial de actividades (auditoría).
- Gestión de cuentas (archivar/restaurar/eliminar con reglas).
- Cambio de contraseña y perfil.

### 5.2 Gestión de Huerta (gestion_huerta)
- Propietarios:
  - CRUD + archivado/restauración + reglas anti-duplicados.
- Huertas propias y rentadas:
  - CRUD, archivado/restauración y reglas de integridad.
- Temporadas:
  - Generación/gestión por huerta, finalización, archivado cascada.
- Cosechas:
  - CRUD con pestañas (Activas/Archivadas/Todas).
  - Integridad con inversiones/ventas.
- Finanzas por cosecha:
  - Inversiones + categorías (Autocomplete con CRUD anidado).
  - Ventas y cierre financiero.
- Reportes:
  - Perfil de huerta, temporada, cosecha (PDF/XLSX según endpoints).

### 5.3 Gestión de Bodega (gestion_bodega)
- Tablero por temporada y semanas (UX jerárquico).
- Recepciones: entradas de producto con reglas.
- Empaques: clasificaciones y operaciones bulk con restricciones.
- Inventarios: control de consumibles/mermas.
- Cierres:
  - Semana: iniciar/finalizar y bloqueo de operaciones.
  - Temporada: cierre global.
- Reportes: semanal y por temporada (binarios).

## 6. Logros Técnicos del Sistema
- Contratos canónicos y scripts de auditoría para evitar regresiones.
- Centralización de estado frontend en Redux sin bifurcaciones.
- Diseño modular y escalable por apps y slices.
- Reglas de negocio consistentes: archivado, cascadas, eliminación segura.
- UI premium ejecutiva con consistencia total.

## 7. Flujo End-to-End (Ciclo de Operación)
1) Admin registra usuarios y asigna permisos.
2) Usuarios registran propietarios y huertas.
3) Se gestionan temporadas y cosechas por huerta.
4) Por cosecha: se registran inversiones, categorías y ventas.
5) En bodega: se opera por semana (recepciones → clasificaciones → cierres).
6) Reportes ejecutivos y operativos se generan para control y auditoría.

## 8. Alcance y Futuro (Roadmap)
- Integración de CI para ejecutar scripts de auditoría obligatoriamente.
- Dashboards analíticos (KPIs por temporada/cosecha/semana).
- Automatización de exportaciones pesadas (colas, tareas) cuando aplique.
- Mayor cobertura de pruebas (unitarias e integración).
- Refinamiento UX continuo sin romper contratos.

## 9. Referencias internas
- Ver reglas y estándares: `docs/fuente_de_la_verdad.md`
- Ver guía de desarrollo: `docs/informe_desarrollador.md`
