# Fuente de la Verdad — Reglas Canónicas del Sistema (Agroproductores Risol)

## 0. Propósito
Este documento define lo que está permitido y lo que está prohibido para mantener el sistema:
- sin bifurcaciones,
- sin inconsistencias,
- sin bugs “fantasma”,
- y con un contrato único reproducible.

Si un cambio viola este documento, el cambio se rechaza.

## 1. Contrato canónico backend (innegociable)
### 1.1 Respuesta estándar
Todas las respuestas deben salir de NotificationHandler (salvo binarios PDF/XLSX):
- success
- message_key
- message
- data

### 1.2 Listados paginados
Todos los listados paginados deben responder:
- data.results (array)
- data.meta (object con count/page/page_size/total_pages/next/previous)

No se permiten keys alternas (ej. data.items, data.bodegas, etc.) para el listado primario.

## 2. Paginación y filtros (innegociable)
### 2.1 Paginación
- Siempre backend.
- Frontend solo envía page/page_size.

### 2.2 Filtros
- Siempre backend.
- Frontend solo envía params (status, search, ordering, etc.).

## 3. Notificaciones (innegociable)
- Backend controla mensaje por message_key.
- Frontend solo renderiza.
- Prohibido hardcodear strings de éxito/error en páginas.

## 4. Redux como fuente única de verdad (innegociable)
- Prohibido manejar datasets de negocio con useState como fuente primaria.
- Prohibido API calls directos en páginas para listados/acciones que ya tienen slice.
- Services no guardan estado.

## 5. Política de transformaciones locales — Opción B (UI-only)
### 5.1 Permitido (UI-only)
Se permite `.filter/.sort/.slice` únicamente para:
- Menús y navegación (Navbar, layout).
- Top-N y recortes visuales (KPIs).
- Orden visual de presentación cuando NO sea un listado de negocio paginado/filtrado.
- Derivaciones de display que no cambien el dataset “real”.

### 5.2 Prohibido (Dataset)
Se prohíbe `.filter/.sort/.slice` para:
- Simular filtros de negocio sobre `data.results`.
- Simular paginación recortando arrays.
- Alterar el conjunto real de entidades mostradas que debería venir del backend.

### 5.3 Comentario obligatorio
Toda transformación UI-only debe incluir una marca/explicación (según política del repo) para que los scripts distingan intención.

### 5.4 Auditoría
`check_ui_transforms_policy.py` debe pasar antes de merge.

## 6. Reglas de archivado/eliminación (consistencia de dominio)
- Archivado es soft-delete (no se pierde historial).
- Eliminación solo si reglas de integridad lo permiten.
- Cascadas (cuando aplica) deben ser deterministas:
  huerta → temporadas → cosechas → inversiones/ventas (según reglas ya definidas en el sistema).

## 7. Errores y validaciones (consistencia)
- Validaciones deben ser coherentes entre módulos.
- Ideal: estandarizar errores en `data.errors` y asociar `message_key` cuando corresponda.
- Prohibido “inventar” formatos distintos por módulo.

## 8. TableLayout y tablas (consistencia)
- Todas las tablas consumen results/meta.
- Page change y page_size change siempre disparan fetch backend.
- No se deriva el total de páginas en frontend “a ojo”.

## 9. Documentación (consistencia y cierre)
- En `docs/` solo debe existir un archivo `fuente_de_la_verdad*.md` canónico.
- Duplicados se eliminan o se archivan sin coincidir con el patrón.
- `check_docs_source_of_truth.py` debe pasar.

## 10. Scripts obligatorios de auditoría
Antes de cerrar/merge:
- python check_ui_transforms_policy.py
- python check_list_contracts.py
- python check_docs_source_of_truth.py

Si cualquiera falla: NO se cierra.
