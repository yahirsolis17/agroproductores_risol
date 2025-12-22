# Auditoría Técnica y de Gobernanza del Sistema

**Fecha:** 21 de Diciembre, 2025
**Tipo:** Auditoría de Evidencia y Gobernanza de Arquitectura
**Estado:** CRÍTICO / ACCIÓN REQUERIDA

---

## Resumen Ejecutivo

Este documento presenta una auditoría estricta basada en la evidencia del código actual ("snapshot"). El objetivo es contrastar la "Constitución Declarada" (la arquitectura teórica) con la "Constitución Real" (lo que ejecuta el código).

El sistema exhibe una arquitectura base sólida (con patrones como `TableLayout` y `NotificationHandler` centralizados), pero sufre de una "deuda de ambigüedad" significativa. Existen bifurcaciones arquitectónicas (React Query vs Redux, múltiples contratos API) que, si no se corrigen de inmediato, degradarán la mantenibilidad y auditabilidad del proyecto a corto plazo.

La recomendación central es **actualizar el canon** para reflejar la realidad operativa (contracts de notificación) y ejecutar una **limpieza quirúrgica** de las desviaciones (eliminar React Query, estandarizar meta-paginación).

---

## 1. Constitución Real vs "Constitución Declarada"

Se ha detectado una discrepancia fundamental en el contrato de respuesta del servidor (Envelope), lo cual afecta la gobernabilidad de todo el stack.

### El Conflicto
*   **Canon Declarado:**
    ```json
    { "success": true, "message_key": "...", "message": "...", "data": {...} }
    ```
*   **Código Ejecutable (Realidad):**
    El backend (`gestion_huerta/utils/notification_handler.py`, `gestion_bodega/utils/notification_handler.py`) y el frontend operan con un objeto de notificación estructurado:
    ```json
    {
      "success": true,
      "notification": {
        "key": "...",
        "message": "...",
        "type": "success|error|warning|info"
      },
      "data": { ... }
    }
    ```

### Implicación de Gobernanza
Si el estándar documentado no coincide con el código que corre en producción, el sistema es imposibles de auditar automáticamente.
**Acción Requerida:** Actualizar inmediatamente el canon para adoptar el objeto `notification`.

---

## 2. Estado del Sistema: Scoreboard de Consistencia

### A. P0 — Bloqueadores (Build Roto / Fractura de Contrato)

1.  **Corrupción Sintáctica en `gestion_huerta/pages/Huertas.tsx`**
    *   **Evidencia:** El archivo contiene un objeto `filterConfig` mal cerrado donde se han "pegado" funciones como `savePropia`.
    *   **Impacto:** Error de compilación ("Expression expected"). Esto no es deuda técnica, es un build roto.

2.  **Inconsistencia Crítica en Contratos de Listas**
    No existe un contrato único para respuestas de tipo lista en el backend. Se observan al menos tres variantes compitiendo:
    *   Variante A: `data: { bodegas: [...], meta }` (Resultados anidados en llave nominal).
    *   Variante B: `data: { results: [...], meta }` (Estándar DRF/Canon).
    *   Variante C: `data: { results, meta, huertas }` (Alias temporal híbrido).
    *   **Evidencia:** `gestion_bodega/views/bodegas_views.py`, `gestion_huerta/views/huerta_views.py`.

---

## 3. Anomalías y Bifurcaciones ("Islas Arquitectónicas")

Las siguientes desviaciones no rompen el build hoy, pero representan una deuda de gobernanza que fragmentará el sistema.

### A. Persistencia de React Query (Cache Paralela)
A pesar de la directriz de usar Redux, `@tanstack/react-query`:
*   Sigue instalado en `package.json`.
*   Tiene uso activo en `gestion_bodega/hooks/useCierres.ts` y `useTableroBodega.ts`.
*   **Riesgo:** Introduce una estrategia de caché paralela incontrolada, compitiendo con el Store global de Redux.

### B. Patrón Legacy de `react-redux` Directo
El canon exige usar hooks tipados (`useAppDispatch`, `useAppSelector`) o hooks de dominio. Sin embargo, múltiples archivos importan `useDispatch/useSelector` directamente de `react-redux`.
*   **Afectados:** Componentes comunes (`ActionsMenu`, `Breadcrumbs`) y páginas críticas (`TableroBodegaPage`, `UsersAdmin`, múltiples reportes en `gestion_huerta`).
*   **Riesgo:** Bypass de tipado estricto, fuga de lógica de negocio a la UI, y consistencia de selectores no garantizada.

### C. Fuga de Lógica en `UsersAdmin`
El componente `gestion_usuarios/pages/UsersAdmin.tsx` realiza llamadas directas a `apiClient` para mutaciones (archivar/restaurar/eliminar), saltándose la arquitectura de capas (`Service -> Slice -> Hook`).
*   **Riesgo:** Estas operaciones quedan fuera de la estandarización de errores, loading states globales y auditoría automática.

### D. Fragmentación de Tipos (`PaginationMeta`)
**Hallazgo Crítico:** Existen múltiples definiciones de la interfaz `PaginationMeta` en el frontend, con estructuras incompatibles:
1.  Solo `count`.
2.  `count`, `next`, `previous`.
3.  `page`, `page_size`, `total_pages`.
*   **Impacto:** El frontend debe implementar lógica defensiva excesiva para "adivinar" qué tipo de paginación recibió.

### E. Servicios con "Lógica de Supervivencia" (Unwrap/Fallback)
Ejemplo: `gestion_bodega/services/empaquesService.ts`.
*   El servicio "inventa" la metadata (`Math.ceil` local) si el backend no la envía.
*   Acepta estructuras arbitrarias.
*   **Impacto:** Oculta bugs del backend. El frontend deja de funcionar como validador del contrato, permitiendo que la degradación del API pase desapercibida hasta que explota en producción.

### F. Dualidad en Control de Permisos (Gating)
Existen dos lógicas paralelas para decidir qué mostrar al usuario:
1.  `common/PermissionButton.tsx` (Usa `useAuth.hasPerm`).
2.  `gestion_bodega/components/common/ActionsMenu.tsx` (Reimplementa lógica con `useAuth` + `useSelector` manual).
*   **Riesgo:** Inconsistencia de UI. Un botón podría estar visible mientras el menú equivalente está oculto.

---

## 4. Fortalezas Reales del Sistema

Para mantener la perspectiva, el sistema cuenta con cimientos sólidos:
1.  **Adopción de `TableLayout`:** Existe un estándar visual y funcional claro para tablas.
2.  **Notificaciones Centralizadas:** El patrón `handleBackendNotification` previene la dispersión de lógica de UI (toasts) en los componentes.
3.  **Infraestructura de Paginación:** El backend posee `GenericPagination`, lo que facilita la estandarización una vez se decida actuar.
4.  **Hooks Modulares:** El patrón arquitectónico correcto existe y se usa en la mayoría de los casos; el objetivo es llegar al 100%.

---

## 5. Matriz de Riesgos Priorizada

| Prioridad | Riesgo | Impacto Técnico | Impacto de Negocio |
| :--- | :--- | :--- | :--- |
| **#1** | **Contrato de Listas + Meta Fragmentado** | Paginación rota, contadores falsos. | Usuario no puede navegar datos fiablemente. |
| **#2** | **Cache Paralela (React Query)** | Estado visual des-sincronizado. | Datos "viejos" mostrados tras guardar cambios. |
| **#3** | **`react-redux` Legacy en UI** | Bypass de seguridad/tipado. | Regresiones visuales por permisos mal calculados. |
| **#4** | **Mutaciones fuera de Slice** | Operaciones "invisibles" al estado global. | Errores no reportados, spinner que no gira. |
| **#5** | **Fallbacks que "inventan" datos** | Ocultamiento de deuda técnica. | Bugs "fantasma" difíciles de reproducir. |

---

## 6. Plan de Evidencia Adicional

Para "blindar" el canon, se requiere capturar la siguiente evidencia "dura":

### A. Backend - Evidencia de Contrato por Endpoint
Recopilar JSONs reales de respuesta para endpoints clave (Usuarios, Huertas, Bodegas, Recepciones) en los siguientes escenarios:
*   `GET list` (page=1, page>1, con filtros).
*   `POST/PATCH` (éxito y error de validación).
*   **Objetivo:** Verificar matemáticamente si el output es `{ data: { results, meta } }` o si persisten los alias.

### B. Frontend - Métricas de "Cero Tolerancia"
*   Conteo de imports `@tanstack/react-query` (Objetivo: 0).
*   Uso de `apiClient` directo en vistas (Objetivo: 0).
*   Definiciones de `PaginationMeta` (Objetivo: 1 global).

---

## 7. Recomendación de Gobernanza (El Nuevo Canon)

### Canon de Respuesta (Backend)
Se debe estandarizar estrictamente a:

```json
{
  "success": true,
  "notification": {
    "key": "CODIGO_OPERACION",
    "message": "Mensaje legible para usuario.",
    "type": "success|error|warning|info"
  },
  "data": {
    "results": [ ... ],
    "meta": {
      "count": 100,
      "next": null,
      "previous": null,
      "page": 1,
      "page_size": 10,
      "total_pages": 10
    }
  }
}
```
*   **Regla:** Cero alias en el nivel raíz de `data`.

### Canon de Frontend
1.  **Todo Mutate** pasa por un Thunk.
2.  **Toda Lista** se carga vía Thunk.
3.  **Toda Lectura** usa hooks de módulo (`useBodegas`, etc.).
4.  **Meta** se define en `types/pagination.ts` una sola vez.

---

## 8. Hoja de Ruta de Remediación (Prioridad Bodega)

1.  **Eliminación de React Query:** Migrar `useCierres` y `useTableroBodega` a Redux Toolkit.
2.  **Unificación de Permisos:** Refactorizar `ActionsMenu` para usar la utilidad canónica de permisos.
3.  **Endurecimiento de Servicios:** Eliminar fallbacks silenciosos. Si el backend no envía meta, el frontend debe fallar visiblemente (o en log) para forzar la corrección en backend.
4.  **Consolidación de Meta:** Crear el tipo único y refactorizar componentes.
5.  **Linting:** Configurar reglas para prohibir imports directos de `react-redux` y `apiClient` en vistas.
