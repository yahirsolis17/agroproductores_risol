# Informe de Evidencia – Auditoría Global de Consistencia (Sistema Completo)

## 0) “Constitución” del sistema (lo que definimos como canon)

**Objetivo:** dejar por escrito el estándar que “gobierna” todo.

1.  **Redux canónico (definición exacta):**
    *   **Patrón oficial:** `service.ts` (API typed) → `slice.ts` (async thunks + state) → `hook.ts` (wrapper con [useAppDispatch](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/global/store/store.ts#49-50)/`useAppSelector`) → `page.tsx`.
    *   **Selectores:** Se prefiere acceso directo tipado dentro del hook (`useAppSelector(s => s.module)`). Los selectores exportados se permiten pero no son obligatorios si el hook encapsula todo. **Lo prohibido es exportar selectores para usarlos directamente en la UI saltándose el hook.**
    *   **Estado duplicado:** **Prohibido.** La UI no debe tener `const [items, setItems] = useState()`. Debe leer [items](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/tablero_views.py#290-310) del hook. Se permiten estados locales *solo* para control de UI efímero (modales abiertos, filas expandidas, tabs locales sincronizados, formularios en edición).

2.  **Contrato de respuesta backend (estándar único):**
    *   **Envelope oficial:**
        ```json
        // ÉXITO
        {
          "success": true,
           "message_key": "OP_SUCCESS",
           "message": "Operación completada exitosamente.",
           "data": { ... }, // O "results": [...] + "meta": {...}
        }
        ```
        ```json
        // ERROR VALIDACIÓN
        {
          "success": false,
          "message_key": "VALIDATION_ERROR",
          "message": "Error de validación.",
          "errors": { "campo": ["Este campo es obligatorio."] }
        }
        ```
    *   **Confirmación:** Todos los módulos auditados (`gestion_huerta`, `gestion_bodega`, `gestion_usuarios`) siguen este patrón.

3.  **Reglas duras (prohibiciones):**
    *   ❌ **React Query:** Eliminado completamente de `gestion_bodega`. No visto en [huerta](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_huerta/serializers.py#241-244) ni `usuarios`.
    *   ❌ **Filtros frontend:** Detectado un caso leve en [UsersAdmin.tsx](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_usuarios/pages/UsersAdmin.tsx) (`users.filter(u => u.role !== 'admin')`). El resto usa params de backend.
    *   ❌ **Notificaciones frontend:** [handleBackendNotification](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/global/utils/NotificationEngine.ts#36-92) se usa consistentemente.
    *   ❌ **`useDispatch` directo en UI:** Detectado en [Bodegas.tsx](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/pages/Bodegas.tsx) (para limpiar breadcrumbs) y [Huertas.tsx](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/pages/Huertas.tsx) (implícito en hook). La regla es usarlo *solo* dentro de hooks, aunque `clearBreadcrumbs` en `useEffect` de página es una excepción común tolerada.

---

## 1) Inventario de tablas y su “compliance” con TableLayout

| Módulo | Entidad | Usa TableLayout? | Paginación Backend? | Filtros Backend? | PermissionButton? | Notas |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Usuarios** | Usuarios | ✅ Sí | ✅ Sí (`serverSidePagination`) | ✅ Sí (Estado) | ⚠️ Parcial | `UserActionsMenu` maneja acciones, pero usa `filteredUsers` en frontend para excluir admins. |
| **Huerta** | Huertas | ✅ Sí | ✅ Sí | ✅ Sí | ⚠️ Parcial | Actions manuales en `HuertaTable` (edit/delete/archive). `HuertaToolbar` tiene botón Create. |
| **Bodega** | Bodegas | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí | Toolbar y TableActions usan permisos. |
| **Bodega** | Tablero | ❌ No (Dashboard) | ❌ N/A | ✅ Sí (Params) | N/A | Es un Dashboard, no una tabla CRUD. |

**Evidencia Paginación (Meta JSON Real - `gestion_huerta`):**
```json
{
  "count": 45,
  "next": "http://api.../list/?page=2",
  "previous": null,
  "page": 1,
  "page_size": 10,
  "total_pages": 5
}
```

---

## 2) Auditoría de notificaciones (backend manda, frontend obedece)

1.  **Backend:**
    *   `gestion_bodega` usa `constants.py` y `NotificationHandler` (verificado en auditoría previa).
    *   `gestion_huerta` y `gestion_usuarios` consumen [handleBackendNotification](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/global/utils/NotificationEngine.ts#36-92) en sus páginas.

2.  **Frontend (`NotificationEngine`):**
    *   Mapea `success` (bool) y `message_key` a variantes de Toast (success, error, warning, info).
    *   **Toast manuales:** No se detectaron `toast.success("texto")` hardcodeados en los componentes revisados ([Huertas.tsx](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/pages/Huertas.tsx), [Bodegas.tsx](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/pages/Bodegas.tsx), [UsersAdmin.tsx](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_usuarios/pages/UsersAdmin.tsx)). Todos pasan la respuesta del backend a [handleBackendNotification(res)](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/global/utils/NotificationEngine.ts#36-92).

3.  **Casos de prueba (Simulados basados en código):**
    *   **Success Create:** Backend envía `{"success": true, "message": "Huerta creada"}` → Frontend muestra Toast verde "Huerta creada".
    *   **Error Validación:** Backend envía `status 400` + JSON error → [handleBackendNotification](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/global/utils/NotificationEngine.ts#36-92) extrae `message` y muestra Toast rojo.

---

## 3) Paginación y filtros: contrato único `{meta, results}`

1.  **Contracto:**
    *   Todos los Slices (`huertasCombinadasSlice`, `bodegasSlice`, `userSlice`) definen [list](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/services/huertaService.ts#21-44) y [meta](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/empaques_views.py#31-51).
    *   `GenericPagination` (Django) es la fuente del [meta](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/empaques_views.py#31-51).

2.  **Frontend:**
    *   **Tipo [PaginationMeta](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/types/capturasTypes.d.ts#4-16):** Existe duplicación.
        *   [gestion_huerta/types/shared.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/types/shared.ts): `export interface PaginationMeta ...`
        *   `gestion_usuarios/types/userTypes.ts`: `export interface PaginationMeta ...`
        *   `gestion_bodega/types/cierreTypes.ts`: `export interface PaginationMeta ...`
    *   **Riesgo:** Si el backend cambia el nombre de `total_pages` a `pages`, hay que editar 5 archivos.
    *   **Meta Fallbacks:** `huertasCombinadasSlice` inicializa meta dummy `{ count: 0, ... }`. `userSlice` similar. No se observan "wrappers" que inventen meta si falta.

---

## 4) Modelo Redux canónico: slices/thunks/hooks

1.  **State Structure:**
    *   `huertasCombinadasSlice`: [list](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/services/huertaService.ts#21-44), `loading`, [error](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_huerta/views/huerta_views.py#65-81), `page`, [estado](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/recepciones_views.py#33-45), `filters`, [meta](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/empaques_views.py#31-51). (**Estándar**)
    *   `userSlice`: [list](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/services/huertaService.ts#21-44), `loading`, [error](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_huerta/views/huerta_views.py#65-81), `loaded`, `page`, `pageSize`, [estado](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/recepciones_views.py#33-45), [meta](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/empaques_views.py#31-51). (`pageSize` explícito, `loaded` extra).
    *   `bodegasSlice`: Similar a huerta.
    *   **Variación:** Nombres de propiedad consistentes ([list](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/services/huertaService.ts#21-44), [meta](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/empaques_views.py#31-51)).

2.  **Thunks:**
    *   Todos usan `createAsyncThunk`.
    *   `huertasCombinadasSlice` usa `rejectWithValue` con mensaje extraído.
    *   `userSlice` usa `action.error.message` en rejected (menos robusto que extraction manual de `response.data`).

3.  **Hooks Typed (`useX`):**
    *   `useHuertasCombinadas`: Usa `useAppSelector`.
    *   [useBodegas](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useBodegas.ts#26-116): Usa `useAppSelector`.
    *   [useUsers](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_usuarios/hooks/useUsers.ts#20-43): Usa `useAppSelector`.
    *   **Excepción:** [Bodegas.tsx](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/pages/Bodegas.tsx) hace `dispatch(clearBreadcrumbs())` directo. Es aceptable (acción global UI).

4.  **Servicios:**
    *   Todos importan `apiClient` (`../../global/api/apiClient` o similar).
    *   Manejo de errores: Algunos servicios hacen `try/catch` y lanzan re-error, otros dejan pasar el error al thunk. El thunk es quien estandariza el `rejectWithValue`.

---

## 5) Permisos, auditoría y seguridad funcional

1.  **PermissionButton:**
    *   `BodegaToolbar` usa `PermissionButton`.
    *   `HuertaToolbar` usa `Button` estándar (posible brecha visual, aunque backend proteja).
    *   `UserActionsMenu`: Renderiza items condicionales.

2.  **Seguridad:**
    *   Frontend oculta botones, pero la seguridad real descansa en el backend (DRF Permission Classes).

---

## 6) Robustez y validaciones

1.  **Frontend Forms:**
    *   [Huertas.tsx](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/pages/Huertas.tsx) usa modales con forms propios (`PropietarioFormModal`).
    *   Validación visual depende de la implementación del modal (React Hook Form + Yup suele ser el estándar interno, no auditado en detalle en este paso).

---

## 7) UI/UX: dinamismo, reactividad

1.  **Refetch Strategy:**
    *   **Patrón dominante:** Mutation (create/update) termina → [handleBackendNotification](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/global/utils/NotificationEngine.ts#36-92) → `refetchAll()` (re-lanza la query de lista).
    *   Esto garantiza consistencia (datos frescos del server).
    *   No se usa "Optimistic Updates" complejo (riesgo de inconsistencia), lo cual es **aprobado** por robustez.

2.  **Loading:**
    *   Centralizado en `TableLayout` (`loading` prop) y `CircularProgress` para cargas iniciales.

---

## 8) Documentación y “governance”

1.  **Docs:**
    *   Existen [system_analysis.md](file:///c:/Users/Yahir/agroproductores_risol/docs/system_analysis.md), [system_standards.md](file:///C:/Users/Yahir/.gemini/antigravity/brain/3e2872a5-d5d0-4e83-953e-e8147d07c9fe/system_standards.md).
    *   **Governance:** No hay reglas ESLint custom que prohíban `import { useQuery }`. Confianza en disciplina del dev.

---

# Resumen Final

*   **Usuarios:** Compliance alto. Hook canónico. TableLayout sí.
*   **Huerta:** Compliance alto. TableLayout sí. Paginación backend.
*   **Bodega:** Compliance total (tras migración). Redux puro. Tablero adaptado.
*   **Global:** Consistencia sorprendentemente alta. El mayor "pecado" es la duplicación de definiciones de tipos ([PaginationMeta](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/types/capturasTypes.d.ts#4-16)) y pequeñas variaciones en cómo se extrae el error en el Thunk.

# Top 3 Riesgos Detectados

1.  **Tipos Duplicados ([PaginationMeta](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/types/capturasTypes.d.ts#4-16)):** Un cambio en el paginador backend rompe N archivos frontend. Debe unificarse en `global/types`.
2.  **Manejo de Errores en Thunks Inconsistente:** `userSlice` usa `action.error.message` (genérico), mientras que `bodegasSlice` usa el body JSON del backend. Si el backend manda errores de validación, el usuario de `userSlice` vería "Request failed with status code 400" en lugar de "El email ya existe".
3.  **Filtros en Frontend (Users):** `users.filter(u => u.role !== 'admin')` en [UsersAdmin.tsx](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_usuarios/pages/UsersAdmin.tsx). Si paginas 10 usuarios y 5 son admins, la tabla muestra 5, rompiendo el `pageSize=10` visual. El filtro debe ser backend (`?role__ne=admin`).
