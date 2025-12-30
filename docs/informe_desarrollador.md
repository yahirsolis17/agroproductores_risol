# Agroproductores Risol — Informe Técnico para Desarrolladores

## 1. Propósito
Este documento explica el sistema para que cualquier desarrollador pueda:
- entender arquitectura y módulos,
- extender sin crear bifurcaciones,
- respetar contratos canónicos,
- y trabajar con seguridad (sin romper reglas de negocio).

Para reglas absolutas y anti-bifurcación, ver: `docs/fuente_de_la_verdad.md`.

## 2. Estructura del repositorio (alto nivel)
- `backend/`
  - `agroproductores_risol/` (proyecto Django)
  - apps: `gestion_usuarios/`, `gestion_huerta/`, `gestion_bodega/`...
  - utils globales: pagination, notification_handler, etc.
- `frontend/`
  - `src/global/` (store, api, utils, routing)
  - `src/modules/` (módulos funcionales por dominio)
  - `src/components/` (layout, reusables)
- `docs/`
  - 3 archivos canónicos (este, archivo.md y fuente_de_la_verdad.md)

## 3. Backend — Convenciones clave
### 3.1 Contrato de respuesta
Se debe responder con el handler canónico. La UI depende de:
- `success`
- `message_key`
- `data` con shapes estables

Listados paginados deben entregar:
- `data.results`
- `data.meta`

### 3.2 Paginación
Se usa `GenericPagination`. En listados, se debe permitir:
- `page`
- `page_size`

### 3.3 Filtros
Los filtros se implementan en backend mediante query params.
El frontend nunca debe filtrar localmente el dataset real.

### 3.4 Errores
Los errores deben alinearse hacia el contrato canónico:
- usar `message_key` cuando corresponda,
- y estandarizar `data.errors` para detallar validaciones.

## 4. Frontend — Convenciones clave
### 4.1 Redux es la única fuente de verdad
- La UI no mantiene “copias paralelas” del dataset.
- Hooks consultan slices y despachan thunks.
- Services no controlan estado; solo consumen API.

### 4.2 Consumo de listados
Toda tabla debe consumir:
- `results` como filas
- `meta` como paginación y conteo

### 4.3 Notificaciones
No se generan strings en páginas. Solo se interpreta `message_key` y `success` desde backend.

### 4.4 UI-only transforms (Opción B)
Se permite `.filter/.sort/.slice` exclusivamente para UI.
Nunca se usa sobre `results` de un listado de negocio para “simular filtros/paginación”.

## 5. Patrón de desarrollo (plantilla por entidad)
### 5.1 Backend
1) Modelo (reglas de integridad, flags de archivado/cascada, etc.)
2) Serializer (validaciones consistentes)
3) ViewSet (list/create/update/delete con contrato canónico)
4) Router/urls (DefaultRouter)
5) Permisos y auditoría (si aplica)

### 5.2 Frontend
1) Service (tipado, ensureSuccess, envelope canónico)
2) Slice (meta/results/loading/error)
3) Thunks (fetch, create, update, archive, restore, delete)
4) Hook (useX) que expone: results, meta, actions
5) Page/Component Table con TableLayout (sin lógica duplicada)

## 6. Scripts de auditoría
El repo cuenta con scripts que deben pasar para declarar cierre:
- `check_list_contracts.py`  
  Detecta listados que no exponen results/meta o señales canónicas.
- `check_ui_transforms_policy.py`  
  Verifica que filter/sort/slice cumplan Opción B (UI-only).
- `check_docs_source_of_truth.py`  
  Exige un solo `fuente_de_la_verdad*.md` canónico en `docs/`.

## 7. Módulos — Guía rápida de navegación
### 7.1 gestion_usuarios
- Auth, permisos, auditoría, gestión de usuarios, actividad.

### 7.2 gestion_huerta
- Propietarios, huertas, temporadas, cosechas, inversiones, ventas, reportes.

### 7.3 gestion_bodega
- Tablero, semanas, recepciones, empaques, inventarios, cierres, reportes.

## 8. “Definition of Done” técnico (para merge seguro)
Un cambio se considera completo si:
- No rompe contrato `results/meta`.
- No agrega notificaciones frontend fuera del motor.
- No introduce filtros/paginación local sobre dataset real.
- Pasa scripts de auditoría.
- Mantiene consistencia entre módulos.

## 9. Referencias internas
- Reglas absolutas: `docs/fuente_de_la_verdad.md`
- Presentación del proyecto: `docs/archivo.md`
