# Fuente de la Verdad — Canon Técnico Estricto (Agroproductores Risol)

> **Regla Suprema:** Este documento invalida cualquier otra documentación, comentario de código o suposición verbal. Si el código contradice este documento, el código está **MAL** y es un Bug reportable prioritario.
> **Scope:** Backend (Django), Frontend (React), Base de Datos y Procesos de Despliegue.

---

## Índice de Contenidos

1.  [Principios Fundamentales de Arquitectura](#1-principios-fundamentales-de-arquitectura)
    *   1.1 Zero Forks Policy (Sin Bifurcaciones)
    *   1.2 Single Source of Truth Chain
    *   1.3 Trazabilidad Obsesiva
2.  [Canon Backend: Interfaz y Comportamiento](#2-canon-backend-interfaz-y-comportamiento)
    *   2.1 El Contrato de Respuesta (The Envelope)
    *   2.2 Listados y Paginación (Standard Pagination)
    *   2.3 Filtrado y Ordenamiento (Server-Side)
    *   2.4 Sistema de Notificaciones (`message_key`)
    *   2.5 Manejo de Errores y Excepciones
3.  [Canon Frontend: Estado y Consumo](#3-canon-frontend-estado-y-consumo)
    *   3.1 Redux Toolkit: La Única Verdad
    *   3.2 Política de Transformaciones ("UI Only")
    *   3.3 Componentes y Reusabilidad (TableLayout)
    *   3.4 Manejo de Formularios y Validación
4.  [Canon de Datos: Integridad y Persistencia](#4-canon-de-datos-integridad-y-persistencia)
    *   4.1 Modelos Base (`TimeStampedModel`)
    *   4.2 Soft Delete y Archivado en Cascada
    *   4.3 Normalización de Datos y Enums
    *   4.4 Manejo de Fechas y Timezones
5.  [Canon de Calidad (Business Logic Specifics)](#5-canon-de-calidad-business-logic-specifics)
    *   5.1 Lógica de Empaque y Calidades
    *   5.2 Integridad de Semanas (Bodega)
6.  [Estilo de Código y Linting](#6-estilo-de-código-y-linting)
7.  [Hall of Shame (Anti-Patrones Prohibidos)](#7-hall-of-shame-anti-patrones-prohibidos)
    *   7.1 El Filtro Cliente (Fatal)
    *   7.2 El useState de Negocio (Prohibido)
    *   7.3 El Magic String (Frágil)

---

## 1. Principios Fundamentales de Arquitectura

### 1.1 "Sin Bifurcaciones" (Zero Forks Policy)
El sistema debe comportarse como un monolito lógico coherente.
*   **Prohibición Expresa:** No crear "endpoints espejo" o "componentes espejo".
    *   *Ejemplo Malo:* `/api/v1/huertas/` y `/api/v1/huertas_mobile/`.
    *   *Ejemplo Bueno:* `/api/v1/huertas/` con serializador adaptativo o query params si es absolutamente necesario.
*   **Unificación de Logica:** Si hay dos formas de calcular la utilidad de una cosecha, una está mal. La lógica debe residir en un solo método del Modelo o Servicio de Dominio en Backend.

### 1.2 "Backend Dicta, Frontend Obedece"
El Frontend es una terminal visual eficiente, pero "tonta" en cuanto a reglas de negocio.
*   **Responsabilidad del Backend:** Decidir qué registros mostrar, ordenarlos, paginarlos, validar integridad, calcular totales.
*   **Responsabilidad del Frontend:** Solicitar datos, renderizarlos fielmente, capturar input usuario, pre-validar formato (no negocio), enviar al backend.
*   **Caso Práctico:** El frontend no suma las ventas para mostrar el total en el dashboard. El frontend recibe un objeto `{ "total_ventas": 5000 }` calculado por el backend.

### 1.3 Trazabilidad Obsesiva
No existe la acción de "borrar" información histórica.
*   **Soft Delete:** Todo borrado es lógico (`is_active=False`, `archivado_en=NOW`).
*   **Auditoría:** Cada mutación de estado genera un log en `RegistroActividad`.
*   **Inmutabilidad de Cierres:** Una vez que una semana o cosecha se "Cierra", el sistema debe impedir criptográficamente (o por lógica férrea) su modificación.

---

## 2. Canon Backend: Interfaz y Comportamiento

### 2.1 El Contrato de Respuesta (The Envelope)
Todo endpoint JSON (REST) debe devolver una respuesta estructurada predecible. Esto permite que el cliente API del frontend automatice el manejo de errores y alertas.

#### Estructura Canónica Exitosa (200 OK, 201 Created)
```json
{
  "success": true,
  "message_key": "ENTITY_CREATED",  // Clave para i18n o lógica frontend
  "message": "La entidad ha sido creada correctamente.", // Fallback humano
  "data": {
    "id": 105,
    "nombre": "Huerta El Milagro",
    "ubicacion": "Carretera Km 5",
    "created_at": "2024-05-10T10:00:00Z"
    // ... campos del recurso ...
  }
}
```

#### Estructura Canónica de Error (400 Bad Request, 404, 500)
```json
{
  "success": false,
  "message_key": "VALIDATION_ERROR", // O "WEEK_CLOSED", "INSUFFICIENT_PERMISSIONS"
  "message": "Error de validación.",
  "data": {
    "errors": {
      "nombre": ["Este campo es obligatorio.", "Ya existe una huerta con este nombre."],
      "fecha": ["La fecha no puede ser futura."]
    },
    "meta_error": {
        "code": 1001,
        "help": "Verifique los campos marcados."
    }
  }
}
```

### 2.2 Listados y Paginación (Standard Pagination)
El sistema utiliza exclusivamente **PageNumberPagination**.
*   **Request:** `GET /api/recurso/?page=2&page_size=20`
*   **Response:**
    ```json
    {
      "success": true,
      "message_key": "LIST_RETRIEVED",
      "data": {
        "results": [ ... array de objetos ... ],
        "meta": {
          "count": 45,        // Total de elementos filtrados en BD
          "page_size": 20,    // Elementos por página
          "current_page": 2,  // Página actual
          "total_pages": 3,   // Total de páginas (ceil(count/size))
          "next": "http://api...?page=3",
          "previous": "http://api...?page=1"
        }
      }
    }
    ```
*   **Regla:** Nunca devolver una lista plana `[]` en un endpoint principal de colección. Siempre envolver en `results/meta`. Para dropdowns pequeños, se puede usar `?pagination=false` si el backend lo soporta explícitamnete.

### 2.3 Filtrado y Ordenamiento (Server-Side)
El backend expone capacidades de filtrado mediante `django-filter` y `OrderingFilter`.
*   **Query Params:**
    *   `search`: Búsqueda de texto completo (nombre, descripción).
    *   `ordering`: Campo de orden (`-created_at`, `nombre`).
    *   Filtros específicos: `bodega_id=1`, `is_active=true`.
*   **Prohibido:** Que el frontend descargue todo y filtre en memoria.

### 2.4 Sistema de Notificaciones (`message_key`)
El backend no hardcodea HTML ni depende del idioma del usuario necesariamente.
*   El backend envía una `message_key` (Slug Screaming Snake Case).
*   El frontend intercepta la respuesta en el interceptor de Axios.
*   El frontend busca la key en su diccionario de traducción.
*   El frontend muestra el Toast/Snackbar correspondiente (Verde para success, Rojo para error).

### 2.5 Manejo de Errores y Excepciones
*   Las excepciones de negocio deben capturarse y transformarse en respuestas 400 con `message_key`.
*   No dejar que exploten trazas de error (500) al usuario final salvo bugs reales.

---

## 3. Canon Frontend: Estado y Consumo

### 3.1 Redux Toolkit: La Única Verdad
Toda la data de negocio vive en el Store de Redux.
*   **Slice Pattern:**
    *   `modules/gestion_huerta/slices/huertasSlice.ts`
*   **State Shape:**
    ```typescript
    interface EntityState<T> {
      data: T[];          // Los results de la página actual
      meta: PaginationMeta | null; // La info de paginación
      loading: boolean;
      error: string | null;
      currentRequest: any; // Para cancelar requests duplicados (opcional)
    }
    ```
*   **Thunks:** Todas las llamadas API son `createAsyncThunk`.
    *   `fetchHuertas`: Bajar datos.
    *   `createHuerta`: Crear y recargar lista (o append optimista).

### 3.2 Política de Transformaciones ("UI Only")
Se permite transformar datos en el frontend **SOLAMENTE** para propósitos visuales.
*   **Permitido:**
    *   Formateo de fechas (`Intl.DateTimeFormat`).
    *   Formateo de moneda (`Intl.NumberFormat`).
    *   Concatenación de strings (`nombre` + " " + `apellido`).
    *   Mapeo de IDs a etiquetas (usando catálogos cargados).
*   **PROHIBIDO:**
    *   `data.filter(x => x.active)` para ocultar borrados. (Pide `?is_active=true` al backend).
    *   `data.sort()` para ordenar registros paginados. (Pide `?ordering=...` al backend).
    *   Calculos financieros agregados (`sum(ventas)`). (Pide el total al backend).

### 3.3 Componentes y Reusabilidad (TableLayout)
No reinventar la tabla.
*   Usar `src/components/TableLayout.tsx`.
*   Este componente ya sabe leer `meta`, enviar eventos de cambio de página y mostrar spinners de carga.
*   Garantiza consistencia visual en todo el sistema.

### 3.4 Manejo de Formularios y Validación
*   Librería: `react-hook-form` + `zod`.
*   Esquema de validación Zod debe coincidir con las reglas del Serializer de Django.
    *   Si Django pide `max_length=100`, Zod debe tener `.max(100)`.
*   Los errores de backend (`400 Bad Request`) se inyectan en el formulario (`setError`) usando las claves del diccionario `errors` de la respuesta canónica.

---

## 4. Canon de Datos: Integridad y Persistencia

### 4.1 Modelos Base (`TimeStampedModel`)
Todo modelo de negocio hereda de:
```python
class TimeStampedModel(models.Model):
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    archivado_en = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    # ... helpers archivar/desarchivar ...
```

### 4.2 Soft Delete y Archivado en Cascada
*   **Trigger:** Usuario pulsa "Eliminar".
*   **Acción:** `modelo.archivar()`.
    *   Set `is_active = False`.
    *   Set `archivado_en = timezone.now()`.
    *   **Cascada:** Busca relaciones hijos (ej. Temporadas de una Huerta). Si la regla es Cascada, las archiva también marcando `archivado_por_cascada=True`.

### 4.3 Normalización de Datos y Enums
*   Usa `TextChoices` de Django para campos categóricos.
*   Al guardar, normaliza strings a UPPERCASE y elimina acentos si es un código (ej. "Niño" -> "NINIO").
*   Nunca guardes "Primera" en una fila y "primera" en otra. Rompe los reportes SQL.

### 4.4 Manejo de Fechas y Timezones
*   **Base de Datos:** UTC.
*   **Django Settings:** `TIME_ZONE = 'America/Mexico_City'` (o la local del cliente). `USE_TZ = True`.
*   **API:** Devuelve ISO 8601 (`2023-10-25T15:30:00-06:00`).
*   **Frontend:** Parsea a fecha local del navegador del usuario.

---

## 5. Canon de Calidad (Business Logic Specifics)

### 5.1 Lógica de Empaque y Calidades
La lógica de calidades es rígida.
*   No existen calidades ad-hoc.
*   Lista permitida: `EXTRA`, `PRIMERA`, `SEGUNDA`, `TERCERA`, `NINIO`, `MADURO`, `RONIA`, `MERMA`.
*   Mapeos especiales: En Plástico, `SEGUNDA` se considera `PRIMERA` para efectos de inventario (regla de negocio 2024). Esto se maneja en el Serializer `normalize_calidad`.

### 5.2 Integridad de Semanas (Bodega)
*   **Unicidad:** No pueden existir dos Semanas abiertas para la misma Bodega/Temporada.
*   **Cobertura:** Cada día del año debe pertenecer a una Semana (o estar en periodo inactivo definido).
*   **Cierre:** El cierre es una transacción atómica. Calcula saldos, congela registros y abre la siguiente semana en la misma transacción DB.

---

## 6. Estilo de Código y Linting

### 6.1 Backend (Python)
*   Estilo: **PEP 8**.
*   Formateador: **Black**.
*   Importaciones: Agrupadas (Standard lib, Third party, Local app).
*   Nombres: `snake_case` para variables/funciones, `PascalCase` para clases.

### 6.2 Frontend (TypeScript)
*   Estilo: **Airbnb** / Standard.
*   Formateador: **Prettier**.
*   Nombres: `camelCase` para variables/funciones, `PascalCase` para componentes React e Interfaces.
*   **Strict Mode:** `noImplicitAny` debe estar activo. No usar `any` salvo emergencia extrema explicada en comentario.

---

## 7. Hall of Shame (Anti-Patrones Prohibidos)

> El museo de los horrores. Si ves código así, refactorízalo inmediatamente.

### 7.1 💀 El Filtro Cliente (Fatal)
```javascript
// MALO (Anti-Patrón)
const allUsers = useUsers(); // Descarga 5000 usuarios
const activeUsers = allUsers.filter(u => u.isActive); // Filtra en memoria
```
**Impacto:** Escala O(n), mata la batería, desperdicia ancho de banda, bloquea el UI thread.
**Correcto:** Pedir `GET /users/?is_active=true` al backend.

### 7.2 💀 El useState de Negocio (Prohibido)
```javascript
// MALO
const [huertas, setHuertas] = useState([]);
useEffect(() => {
  api.get('/huertas').then(res => setHuertas(res.data));
}, []);
```
**Impacto:** Estado efímero, no compartido, se pierde al navegar, difícil de depurar.
**Correcto:** `dispatch(fetchHuertas())` y `useSelector(selectHuertas)`.

### 7.3 💀 El Magic String (Frágil)
```javascript
if (error.message === "La semana ya está cerrada") { ... }
```
**Impacto:** Si se corrige la ortografía en backend, el frontend deja de funcionar.
**Correcto:** `if (error.message_key === "WEEK_CLOSED") { ... }`

### 7.4 💀 El Endpoint Frankestein
Un endpoint que hace 3 cosas distintas dependiendo de un flag booleano oscuro.
**Impacto:** Imposible de mantener y testear.
**Correcto:** Recursos RESTful claros `/api/recepciones/` vs `/api/reportes/recepciones/`.

---
**Fin del Canon Técnico.**
Cualquier desviación requiere aprobación explícita del Arquitecto de Software líder.
