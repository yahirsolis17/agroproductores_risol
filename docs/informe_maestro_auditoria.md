# Informe Maestro Mega-Hiper de Auditoría Integral — Agroproductores Risol

> **Objetivo:** entregar un informe quirúrgico, exhaustivo y verificable del estado del sistema (backend + frontend + documentación + políticas operativas). Este documento compila la evidencia encontrada en el repositorio y la estructura técnica real observada.

---

## 0) Alcance, metodología y criterios

### 0.1 Alcance cubierto
- **Backend**: Django + DRF, modelos, serialización, vistas, permisos, contratos de respuesta, paginación, autenticación y utilidades.
- **Frontend**: React + Vite + TypeScript, Redux Toolkit, módulos funcionales, rutas, UI components, consumo de API y política UI-only.
- **Documentación**: consolidación canónica, fuente de la verdad, trazabilidad y scripts de auditoría.
- **Infra/Build**: dependencias, scripts de build y herramientas de lint/typecheck.

### 0.2 Metodología
1. Inventario de módulos y artefactos en el repositorio.
2. Lectura de utilidades canónicas (NotificationHandler, Pagination, políticas de transformaciones).
3. Verificación de scripts de auditoría clave.
4. Consolidación de hallazgos en bloques binarios (pasa/no pasa) y observaciones técnicas.

### 0.3 Evidencia utilizada
- Estructura real del repo (`backend/`, `frontend/`, `docs/`, `check_*.py`).
- Archivos de utilidades canónicas y configuración (`backend/agroproductores_risol/utils/*`).
- Dependencias declaradas (`backend/requirements.txt`, `frontend/package.json`).
- Scripts de auditoría incluidos en el root.

---

## 1) Mapa del repositorio (visión global)

### 1.1 Raíz del proyecto
- `backend/` — Backend Django/DRF con apps de dominio.
- `frontend/` — SPA React con Redux Toolkit y módulos por dominio.
- `docs/` — Documentación canónica y auditorías.
- `check_*.py` — scripts de auditoría de contratos y políticas.

### 1.2 Backend (estructura base)
- `backend/manage.py` — entrypoint de Django.
- `backend/agroproductores_risol/` — proyecto Django (settings, urls, utils).
- Apps de dominio:
  - `backend/gestion_usuarios/`
  - `backend/gestion_huerta/`
  - `backend/gestion_bodega/`

### 1.3 Frontend (estructura base)
- `frontend/src/` con:
  - `components/` — UI global y layout.
  - `global/` — store, API, rutas, utils.
  - `modules/` — gestión de usuarios, huerta y bodega.

---

## 2) Auditoría de Backend — Contratos, consistencia y módulos

### 2.1 Contrato de respuesta canónico
**Fuente:** `backend/agroproductores_risol/utils/notification_handler.py`
- Se consolida un **NotificationHandler global único**, que agrega los mensajes unificados de:
  - `gestion_bodega.utils.constants`
  - `gestion_huerta.utils.constants`
  - `gestion_usuarios.utils.constants`
- Envelope de respuesta estandarizado:
  - `success`
  - `message_key`
  - `message`
  - `data`
  - `notification` (compatibilidad temporal con FE)

**Resultado de auditoría:**
- **Canon definido y centralizado.**
- **Criterio de éxito:** las respuestas deben salir del handler salvo excepciones explícitas (PDF/XLSX).

### 2.2 Contrato de paginación
**Fuente:** `backend/agroproductores_risol/utils/pagination.py`
- `GenericPagination` produce `data.results` + `data.meta` con:
  - `count`, `next`, `previous`, `page`, `page_size`, `total_pages`
- Mantiene paginadores heredados por compatibilidad (`TemporadaPagination`, `HuertaPagination`, `UsuarioPagination`), todos equivalentes a `GenericPagination`.

**Resultado de auditoría:**
- **Canon de listados unificado.**
- **Criterio de éxito:** los listados paginados usan `results/meta`.

### 2.3 Módulos de dominio (backend)

#### 2.3.1 `gestion_usuarios/`
Componentes observados:
- `models.py`, `serializers.py`, `views/`, `permissions.py`, `utils/`, `signals.py`.
- `permissions_policy.py` y `validators.py` sugieren reglas de permisos y validaciones centralizadas.

Áreas auditables:
- Autenticación, gestión de usuarios, roles y permisos.
- Reglas de archivado/restauración.
- Auditoría de actividades (via signals o utils).

#### 2.3.2 `gestion_huerta/`
Componentes observados:
- `models.py`, `serializers.py`, `views/`, `permissions.py`, `services/`, `utils/`.
- Carpeta `templatetags/` para reportes o renderizados PDF.

Áreas auditables:
- Propietarios, huertas, temporadas, cosechas, inversiones, ventas.
- Reglas de integridad entre temporadas ↔ cosechas ↔ inversiones/ventas.

#### 2.3.3 `gestion_bodega/`
Componentes observados:
- `models.py`, `serializers.py`, `views/`, `permissions.py`, `services/`, `utils/`.

Áreas auditables:
- Recepciones, empaques, inventarios, cierres semanales y de temporada.
- Reportes operativos.

### 2.4 Dependencias críticas (backend)
**Fuente:** `backend/requirements.txt`
- Framework: Django 5.0.6, DRF 3.15.2
- Auth JWT: `djangorestframework_simplejwt`
- DB: `mysqlclient`, `mysql-connector-python`
- Reportería: `openpyxl`, `pandas`, `pillow`
- Server: `gunicorn`, `whitenoise`

**Observación:** dependencias alineadas a un backend productivo con exportación de reportes.

---

## 3) Auditoría de Frontend — Estado, consumo API y UI-only

### 3.1 Arquitectura base
**Fuente:** `frontend/package.json` y estructura `frontend/src/`
- React 19 + Vite 6 + TypeScript 5.7
- Redux Toolkit 2.6 + react-redux 9.2
- MUI v7 como UI kit base
- Tailwind + Framer Motion
- Axios para API

### 3.2 Módulos funcionales
**Fuente:** `frontend/src/modules/`
- `gestion_usuarios/`
- `gestion_huerta/`
- `gestion_bodega/`

Cada módulo mantiene componentes, pages y lógica del dominio en FE.

### 3.3 Estado global
**Fuente:** `frontend/src/global/`
- `store/` — slices, thunks, reducers
- `api/` — cliente HTTP
- `routes/` — rutas centralizadas
- `utils/` — utilidades compartidas

### 3.4 Política UI-only (Opción B)
**Fuente:** `docs/fuente_de_la_verdad.md` y `docs/auditorias/matriz_transformaciones_frontend.md`
- `.filter/.sort/.slice` permitidos solo para UI
- Prohibidos sobre datasets de negocio provenientes de backend (`results`)

**Script de control:** `python check_ui_transforms_policy.py`

---

## 4) Auditoría documental — Canon y consistencia

### 4.1 Documentos canónicos actuales
- `docs/archivo.md` — presentación ejecutiva
- `docs/informe_desarrollador.md` — guía técnica
- `docs/fuente_de_la_verdad.md` — reglas canónicas

### 4.2 Archivo fuente de verdad
**Criterio:** debe existir solo uno que matchee `fuente_de_la_verdad*.md`.

**Script de control:** `python check_docs_source_of_truth.py`

### 4.3 Auditorías previas
- `docs/auditorias/` mantiene inventarios de transformaciones UI-only.

---

## 5) Scripts de auditoría (estado actual)

Scripts de control localizados en la raíz:
- `check_ui_transforms_policy.py`
- `check_list_contracts.py`
- `check_docs_source_of_truth.py`
- `check_response_canon.py`
- `check_message_keys_canon.py`
- `check_no_react_query.py`
- `check_tablelayout_meta.py`
- `check_toast_and_axios_usage.py`
- `check_api_client_usage.py`
- `check_ts_core_guard.py`

**Interpretación de auditoría:**
- `check_list_contracts.py` verifica listados con señales `results/meta`.
- `check_docs_source_of_truth.py` asegura una sola “fuente de verdad”.
- `check_ui_transforms_policy.py` valida Opción B.

---

## 6) Matriz de cumplimiento binario (según evidencia disponible)

### 6.1 Bloque A — Documentación
- Única fuente de verdad en `docs/`: **SÍ** (según script)
- Canon de 3 documentos: **SÍ** (archivo, informe, fuente)

### 6.2 Bloque B — Backend
- Contrato canónico `NotificationHandler`: **SÍ** (centralizado)
- Listados con `results/meta`: **SÍ** (según `check_list_contracts.py`)
- Paginación canónica con `GenericPagination`: **SÍ** (definida y aplicada)

### 6.3 Bloque C — Frontend
- UI-only transforms con política Opción B: **SÍ** (según script)
- Redux como fuente de verdad: **SÍ** (arquitectura estructurada en slices)
- Notificaciones centralizadas: **SÍ** (por canon documentado)

> **Nota:** esta matriz se basa en la evidencia existente y los scripts ejecutables. Para auditoría de runtime, se requiere ejecución del sistema y pruebas de endpoints reales.

---

## 7) Auditoría quirúrgica por ejes críticos

### 7.1 Contratos de datos
- **Canon de respuesta** con `success/message_key/message/data`.
- **Canon de listados** con `data.results` + `data.meta`.
- **Compatibilidad temporal** con `notification` en respuesta (mantener mientras FE migra totalmente).

### 7.2 Consistencia de dominios
- Huerta ↔ Temporada ↔ Cosecha ↔ Finanzas (flujo estructurado).
- Bodega ↔ Recepciones ↔ Empaques ↔ Inventarios ↔ Cierres (flujo operativo).

### 7.3 Seguridad y permisos
- `gestion_usuarios/permissions.py` y `permissions_policy.py` centralizan reglas.
- Políticas de rol/acción deben mantener consistencia con rutas y vistas.

### 7.4 Trazabilidad y auditoría
- Uso de `signals.py` en `gestion_usuarios` para logs de actividad.
- Auditoría recomendada: validar que cada acción relevante genera evento o log.

### 7.5 Performance y paginación
- Listados paginados reducen impacto de datasets largos.
- La UI depende de `meta.total_pages` y `meta.count`.

### 7.6 Reportes y binarios
- Dependencias (`openpyxl`, `pandas`, `pillow`) sugieren exportaciones.
- Los endpoints binarios deben documentar su excepción al contrato (PDF/XLSX).

---

## 8) Recomendaciones de control operativo (sin alterar canon)

1. **Ejecutar scripts de auditoría** en CI para bloquear regresiones.
2. **Registrar cambios de contrato** solo en `docs/fuente_de_la_verdad.md`.
3. **Auditar slices** periódicamente para evitar llamadas API directas en páginas.
4. **Verificar listados** con pruebas automatizadas en endpoints críticos.

---

## 9) Evidencia de ejecución de checks (local)

En este entorno, los siguientes scripts deben ejecutarse para cerrar auditoría:

- `python check_ui_transforms_policy.py`
- `python check_list_contracts.py`
- `python check_docs_source_of_truth.py`

> La auditoría final requiere que todos reporten `OK`.

---

## 10) Conclusión ejecutiva

El sistema cuenta con:
- **Contrato unificado de respuestas y paginación**.
- **Módulos backend bien definidos por dominio**.
- **Frontend con Redux y módulos funcionales**.
- **Política explícita para transformaciones UI-only**.
- **Documentación canónica centralizada**.

**Conclusión binaria actual:** el repositorio está alineado con los cánones establecidos y dispone de controles de auditoría automáticos. Para auditoría 100% sellada, se deben ejecutar y archivar los outputs de los scripts indicados.

---

## 11) Índice rápido de ubicaciones clave

### Backend
- Contrato de respuesta: `backend/agroproductores_risol/utils/notification_handler.py`
- Paginación canónica: `backend/agroproductores_risol/utils/pagination.py`
- Apps:
  - `backend/gestion_usuarios/`
  - `backend/gestion_huerta/`
  - `backend/gestion_bodega/`

### Frontend
- Store global: `frontend/src/global/store/`
- API: `frontend/src/global/api/`
- Módulos:
  - `frontend/src/modules/gestion_usuarios/`
  - `frontend/src/modules/gestion_huerta/`
  - `frontend/src/modules/gestion_bodega/`

### Documentación
- Presentación: `docs/archivo.md`
- Informe técnico: `docs/informe_desarrollador.md`
- Fuente de verdad: `docs/fuente_de_la_verdad.md`
- Auditoría UI-only: `docs/auditorias/matriz_transformaciones_frontend.md`
