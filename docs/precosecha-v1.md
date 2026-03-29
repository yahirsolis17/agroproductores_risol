# PreCosecha v1

## Estado

- Estado: implementado.
- Dominio: `gestion_huerta`.
- Alcance: v1 conservadora, sin prorrateo ni amortizacion automatica.

## Objetivo

`PreCosecha` existe para registrar gastos anticipados de preparacion de una temporada futura sin mezclarlos con la operacion actual de la huerta.

Resuelve este caso de negocio:

- la temporada actual sigue activa, con cosechas, ventas e inversiones normales
- en paralelo, la siguiente temporada ya puede empezar a generar gasto de preparacion
- esos gastos deben tener owner contable explicito desde el alta
- esos gastos no deben caer en `Cosecha`, `InversionesHuerta` ni `FinanzasPorCosecha`

## Problema que resuelve

Antes de `PreCosecha`, el flujo financiero de huerta estaba centrado en:

- `Huerta -> Temporada -> Cosecha -> InversionesHuerta / Venta`

Ese flujo funciona para operacion real, pero no para gasto anticipado. Forzar ese tipo de gasto dentro del modelo operativo generaba estos riesgos:

- mezcla contable entre gasto operativo y gasto anticipado
- contaminacion de `FinanzasPorCosecha`
- reportes de temporada incoherentes
- uso de soluciones artificiales como cosechas placeholder
- ambiguedad sobre a que temporada pertenece realmente el gasto

## Decision de arquitectura

`PreCosecha` entra como dominio separado.

- No reutiliza `InversionesHuerta`
- No pertenece a `Cosecha`
- No entra en `FinanzasPorCosecha`
- Siempre pertenece desde el origen a una `Temporada` destino
- Esa `Temporada` debe estar en estado `planificada`
- Cuando la temporada pasa a `operativa`, la `PreCosecha` queda congelada en solo lectura

Esta decision separa claramente dos tiempos distintos:

- tiempo operativo actual
- tiempo financiero futuro

## Cambio habilitante: lifecycle de Temporada

Para poder introducir `PreCosecha` sin romper el sistema, `Temporada` tuvo que distinguir entre:

- `planificada`
- `operativa`

Sin esa distincion, una temporada futura con `PreCosecha` se comportaria como temporada operativa actual en:

- dashboard
- featured season
- alertas operativas
- busqueda global

Con el lifecycle actual:

- una temporada futura se crea `planificada` por default
- una temporada futura no puede crearse `operativa`
- una temporada `operativa` no puede tener `fecha_inicio` futura
- una temporada `planificada` no puede finalizarse
- el cambio `planificada -> operativa` se hace con una accion dedicada

## Invariantes

- Toda `PreCosecha` debe tener `temporada` destino desde el alta.
- `PreCosecha.fecha < Temporada.fecha_inicio`
- `PreCosecha` solo puede existir en temporada `planificada`
- `PreCosecha` nunca puede reasignarse a otra temporada
- `PreCosecha` nunca entra en reportes de cosecha
- `PreCosecha` nunca entra en `FinanzasPorCosecha`
- `PreCosecha` solo muta si la temporada esta activa, no finalizada y `planificada`
- Al pasar la temporada a `operativa`, la `PreCosecha` queda congelada

## Modelo de dominio

### Temporada

`Temporada` agrega `estado_operativo` con dos valores:

- `planificada`
- `operativa`

`fecha_inicio` conserva su semantica original:

- representa el inicio operativo real de la temporada
- no representa el inicio de planificacion

### CategoriaPreCosecha

`CategoriaPreCosecha` es un catalogo independiente del catalogo operativo.

Se separo de `CategoriaInversion` por tres razones:

- semantica distinta
- UX mas clara
- integridad de borrado, archivado y conteo de uso

### PreCosecha

`PreCosecha` contiene los campos principales del gasto anticipado:

- `categoria`
- `fecha`
- `descripcion`
- `gastos_insumos`
- `gastos_mano_obra`
- `temporada`
- `huerta` o `huerta_rentada`
- campos de estado y archivado

Notas importantes:

- `temporada` es obligatoria
- el origen de huerta no es libre; se deriva o valida contra la temporada
- `gastos_totales` se calcula a partir de insumos y mano de obra
- soporta archivado y restauracion con el mismo patron del modulo

## Reglas de negocio

- `PreCosecha` representa gasto anticipado de preparacion, no gasto operativo.
- La temporada actual puede seguir operando normalmente mientras existe `PreCosecha` para la siguiente.
- La temporada futura debe existir antes del primer registro de `PreCosecha`.
- No existe estado "pendiente de asignacion".
- No existe ownership suelto a nivel huerta.
- No existe cosecha placeholder.
- No existe prorrateo automatico hacia cosechas en v1.
- No existe recuperacion automatica por cosecha en v1.
- No existe amortizacion automatica en v1.

## Freeze

Cuando una temporada cambia de `planificada` a `operativa`, todas sus `PreCosechas` quedan congeladas.

Congelada significa:

- no crear
- no editar
- no archivar
- no restaurar
- no eliminar

Esto protege la trazabilidad financiera y evita que un gasto de preparacion siga mutando dentro del periodo operativo real.

## Integracion backend

Se agregaron recursos propios dentro de `gestion_huerta`.

### API de PreCosecha

- `GET /huerta/precosechas/`
- `POST /huerta/precosechas/`
- `GET /huerta/precosechas/{id}/`
- `PUT /huerta/precosechas/{id}/`
- `PATCH /huerta/precosechas/{id}/`
- `DELETE /huerta/precosechas/{id}/`
- `POST /huerta/precosechas/{id}/archivar/`
- `POST /huerta/precosechas/{id}/restaurar/`

### API de CategoriaPreCosecha

- `GET /huerta/categorias-precosecha/`
- `GET /huerta/categorias-precosecha/all/`
- `POST /huerta/categorias-precosecha/`
- `PUT /huerta/categorias-precosecha/{id}/`
- `PATCH /huerta/categorias-precosecha/{id}/`
- `DELETE /huerta/categorias-precosecha/{id}/`
- `POST /huerta/categorias-precosecha/{id}/archivar/`
- `POST /huerta/categorias-precosecha/{id}/restaurar/`

### Validaciones principales

Las validaciones viven en modelo, serializer y viewset. Las mas importantes son:

- temporada activa
- temporada no finalizada
- temporada `planificada`
- fecha estrictamente anterior a `temporada.fecha_inicio`
- categoria activa
- total de gasto mayor a `0`
- origen consistente con la temporada
- prohibicion de cambiar `temporada` en update

## Permisos

Permisos de `PreCosecha`:

- `view_precosecha`
- `add_precosecha`
- `change_precosecha`
- `delete_precosecha`
- `archive_precosecha`
- `restore_precosecha`

Permisos de `CategoriaPreCosecha`:

- `view_categoriaprecosecha`
- `add_categoriaprecosecha`
- `change_categoriaprecosecha`
- `delete_categoriaprecosecha`
- `archive_categoriaprecosecha`
- `restore_categoriaprecosecha`

Permiso de lifecycle:

- `activate_operational_temporada`

## Integracion frontend

El punto de entrada de `PreCosecha` es `Temporadas`, no `Cosechas`.

### UX esperada

El usuario debe poder entender simultaneamente:

- temporada actual operativa
- temporada futura en preparacion

Por eso la UX separa temporadas:

- `operativas`
- `planificadas`
- `archivadas`
- `todas`

La accion `PreCosecha` aparece dentro del contexto de temporada.

### Pantalla dedicada

La pantalla de `PreCosecha` incluye:

- encabezado con temporada, huerta y propietario
- tabla paginada
- filtros por estado, categoria, fecha y texto
- formulario modal
- warning UX para evitar doble captura manual
- modo solo lectura cuando la temporada ya no permite mutacion

## Reportes y exportacion

`PreCosecha` entra solo en reporte de temporada.

No entra en:

- reporte de cosecha
- `FinanzasPorCosecha`
- KPIs operativos del dashboard

El reporte de temporada agrega:

- `precosecha_total`
- `ganancia_neta_con_precosecha`
- bloque `precosechas.detalle`
- tabla separada de precosechas
- serie temporal separada
- KPI de gastos anticipados

Exportacion:

- PDF con seccion dedicada de `PreCosecha`
- Excel con hoja separada `PreCosecha`

## Dashboard, cache y operacion actual

Las temporadas `planificadas` se excluyen del contexto operativo.

Eso implica:

- no aparecen como `featured_temporada`
- no se toman como temporada operativa actual
- no salen como temporada activa normal en busqueda global

Ademas, cambios en `PreCosecha` o `CategoriaPreCosecha` invalidan cache de reportes para evitar datos stale.

## Archivado y cascadas

`PreCosecha` participa en cascadas reales:

- huerta -> temporadas -> precosechas
- temporada -> precosechas

Reglas importantes:

- lo archivado por cascada se puede restaurar por cascada
- lo archivado manualmente no se restaura automaticamente
- no se puede borrar una temporada con `precosechas`
- no se puede borrar una `PreCosecha` activa; primero debe archivarse

## Riesgos evitados

Esta implementacion evita explicitamente:

- mezcla contable con `InversionesHuerta`
- contaminacion de `FinanzasPorCosecha`
- temporada futura tratada como temporada operativa actual
- categoria compartida con semantica equivocada
- ownership ambiguo sin temporada destino
- cosecha placeholder
- prorrateo automatico prematuro
- doble interpretacion del gasto anticipado como gasto operativo de cosecha

## Fuera de v1

Se deja deliberadamente fuera de esta version:

- recuperacion por cosecha
- amortizacion automatica
- matching fuerte contra doble captura
- redistribucion financiera automatica
- inclusion en dashboard operativo
- inclusion en reportes de cosecha

## Archivos clave

Backend:

- `backend/gestion_huerta/models.py`
- `backend/gestion_huerta/serializers.py`
- `backend/gestion_huerta/views/precosecha_views.py`
- `backend/gestion_huerta/views/categoria_precosecha_views.py`
- `backend/gestion_huerta/views/temporadas_views.py`
- `backend/gestion_huerta/services/reportes/temporada_service.py`
- `backend/gestion_huerta/services/exportacion/pdf_exporter.py`
- `backend/gestion_huerta/services/exportacion/excel_exporter.py`
- `backend/gestion_huerta/signals.py`

Frontend:

- `frontend/src/modules/gestion_huerta/pages/Temporadas.tsx`
- `frontend/src/modules/gestion_huerta/pages/PreCosechas.tsx`
- `frontend/src/modules/gestion_huerta/components/precosecha/PreCosechaFormModal.tsx`
- `frontend/src/modules/gestion_huerta/components/precosecha/PreCosechaTable.tsx`
- `frontend/src/modules/gestion_huerta/services/precosechaService.ts`
- `frontend/src/modules/gestion_huerta/services/categoriaPreCosechaService.ts`
- `frontend/src/global/routes/moduleRoutes.ts`
- `frontend/src/global/constants/breadcrumbRoutes.ts`

## Resumen corto

`PreCosecha v1` es un dominio financiero anticipado, de ownership explicito, ligado a una temporada futura `planificada`, separado de cosecha e inversiones operativas, congelado al inicio operativo y reportado solo a nivel temporada.
