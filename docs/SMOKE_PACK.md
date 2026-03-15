# System Canon Smoke Pack (Evidence)

> **Versión**: 1.0 (Audit Ready)
> **Fecha**: 2025-12-28
> **Propósito**: Conjunto mínimo de pruebas para certificar el cumplimiento del Canon Arquitectónico.

Este documento sirve como "oráculo" para validar que el sistema no ha sufrido regresiones en su contrato fundamental.

---

## 1. Contrato API (Backend)

### A. Endpoint JSON Estándar (Envelope)
**Regla**: Todo endpoint JSON debe retornar envelope con `success`, `message_key` y `data`. `notification` es permitido solo por compatibilidad.
**Prueba de Referencia**: `GET /usuarios/me/`
**Response Esperado (Shape Check)**:
```json
{
    "success": true,                        // ✅ Obligatorio
    "message_key": "user_fetched_success",  // ✅ Obligatorio (Snake case)
    "message": "Usuario recuperado...",     // ✅ Obligatorio (Human readable)
    "data": {                               // ✅ Obligatorio (Payload o null)
        "id": 1,
        "email": "..."
    }
}
```

### B. Paginación (Server Truth)
**Regla**: El backend dicta la verdad de paginación en `meta`. El UI no debe inferir ni hardcodear.
**Prueba de Referencia**: `GET /huerta/temporadas/?page=1`
**Response Esperado**:
```json
{
    "data": {
        "results": [...],
        "meta": {
            "count": 45,
            "page": 1,
            "page_size": 10,        // ✅ Backend manda el tamaño real
            "total_pages": 5,       // ✅ Backend calcula el total
            "next": "...",
            "previous": null
        }
    }
}
```

### C. Excepción Binaria
**Regla**: Solo endpoints de reporte/descarga pueden evitar el envelope JSON.
**Prueba de Referencia**: `GET /reportes/semanal/download?format=pdf`
**Validación**:
- Header `Content-Type`: `application/pdf` (o excel).
- Si hay error 500, DEBE responder JSON `ApiError` (no html/text).

---

## 2. Contrato Frontend (Consumo)

### A. Cero Parsing Manual
**Regla**: Prohibido acceder a `.data.data` manualmente.
**Mecanismo**: Todos los Thunks usan `ensureSuccess(response.data)` o `extractApiError(err)`.

### B. Cero React Query
**Regla**: El estado servidor vive en Redux Slices.
**Evidencia**: Búsqueda global de `useQuery` / `useMutation` debe retornar 0 resultados (salvo renames legacy como `useURLSearchParams`).

---

## 3. Comandos de Certificación (CI Gates)

Para considerar el sistema "Verde", deben pasar estos comandos:

| Gate | Comando | Propósito |
|------|---------|-----------|
| **Type Integrity** | `npm run typecheck` | Garantiza 0 `any` en core. |
| **Build Integrity** | `npm run build` | Garantiza que el sistema compila. |
| **Linting** | `npm run lint` | Garantiza reglas de estilo y prohibiciones (no toast, no axios raw). |
| **Backend Integrity** | `python manage.py check` | Garantiza validez Django. |
| **Arch Guardrails** | `python check_response_canon.py` | Garantiza 0 fugas de `Response` crudo. |
| **Key Consistency** | `python check_message_keys_canon.py` | Garantiza keys centralizadas en constants. |
