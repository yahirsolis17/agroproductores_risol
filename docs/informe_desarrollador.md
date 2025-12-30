# Informe Técnico para Desarrolladores (The Developer Bible)

> **Agroproductores Risol**  
> **Guía Oficial de Ingeniería y Operaciones**  
> **Target Audience:** Backend Devs, Frontend Devs, DevOps.

---

## Índice

1.  [Bienvenida y Onboarding](#1-bienvenida-y-onboarding)
2.  [Entorno de Desarrollo (Setup)](#2-entorno-de-desarrollo-setup)
    *   2.1 Backend Setup (Django)
    *   2.2 Frontend Setup (React/Vite)
    *   2.3 Base de Datos y Servicios
3.  [Anatomía del Código (Codebase Map)](#3-anatomía-del-código-codebase-map)
    *   3.1 Backend Blueprint
    *   3.2 Frontend Blueprint
4.  [Backend Deep Dive: Guía de Implementación](#4-backend-deep-dive-guía-de-implementación)
    *   4.1 Creando Modelos y Migraciones
    *   4.2 Serializers y Validaciones
    *   4.3 ViewSets y Lógica de Negocio
    *   4.4 Rutas y URLs
5.  [Frontend Deep Dive: Guía de Implementación](#5-frontend-deep-dive-guía-de-implementación)
    *   5.1 Arquitectura Redux (Duck Pattern / Slices)
    *   5.2 Servicios API (Axios + Types)
    *   5.3 Hooks Personalizados
    *   5.4 Componentes Visuales y Layout
6.  [Scripts de Auditoría y QA](#6-scripts-de-auditoría-y-qa)
7.  [Snippets y Recetas Comunes](#7-snippets-y-recetas-comunes)
8.  [Troubleshooting (FAQ Técnico)](#8-troubleshooting-faq-técnico)

---

## 1. Bienvenida y Onboarding

Bienvenido al equipo de ingeniería de Agroproductores Risol. Estás a punto de trabajar en un sistema crítico de misión empresarial. Este no es un proyecto de fin de semana; es la columna vertebral operativa de una empresa real.

**Filosofía del equipo:**
*   **Aburrido es Bueno:** Preferimos código predecible, legible y estándar sobre soluciones "mágicas" o excesivamente abstractas.
*   **Explicit is better than implicit:** Nombres de variables largos y descriptivos (`total_kilos_netos` vs `tkn`). Tipado estricto en TS y Type Hints en Python.
*   **Respeto al Canon:** Las reglas en `fuente_de_la_verdad.md` no son sugerencias, son leyes. Romperlas introduce deuda técnica que pagamos con intereses altos.
*   **User First:** El sistema debe ser a prueba de balas porque los usuarios operan en condiciones de campo, con internet inestable y bajo presión.

---

## 2. Entorno de Desarrollo (Setup)

### 2.1 Backend Setup (Django)

**Requisitos:** Python 3.10+, pip, virtualenv, cliente MySQL (opcional).

1.  **Clonar el repositorio:**
    ```bash
    git clone <repo_url>
    cd agroproductores_risol
    ```
2.  **Crear entorno virtual:**
    Es vital aislar las dependencias.
    ```bash
    python -m venv backend/venv
    # Activar:
    # Windows:
    .\backend\venv\Scripts\activate
    # Linux/Mac:
    source backend/venv/bin/activate
    ```
3.  **Instalar dependencias:**
    ```bash
    cd backend
    pip install -r requirements.txt
    ```
4.  **Configurar variables de entorno (`.env`):**
    En `backend/agroproductores_risol/`, crea un archivo `.env`.
    *Template:*
    ```ini
    DEBUG=True
    SECRET_KEY=dev_secret_key_insegura_para_local
    ALLOWED_HOSTS=localhost,127.0.0.1
    # Base de datos (SQLite por defecto para dev rápido, MySQL recomendado)
    DATABASE_URL=sqlite:///db.sqlite3
    # DATABASE_URL=mysql://user:pass@localhost:3306/risol_db
    CORS_ALLOWED_ORIGINS=http://localhost:5173
    ```
5.  **Migraciones iniciales:**
    Aplica el esquema a la BD.
    ```bash
    python manage.py migrate
    ```
6.  **Crear superusuario:**
    Necesario para entrar al Admin de Django.
    ```bash
    python manage.py createsuperuser
    # Teléfono: 1234567890
    # Password: 123
    ```
7.  **Correr servidor:**
    ```bash
    python manage.py runserver
    ```
    Visita `http://localhost:8000/api/` y `http://localhost:8000/admin`.

### 2.2 Frontend Setup (React/Vite)

**Requisitos:** Node.js 18 LTS+, npm 9+.

1.  **Ir al directorio frontend:**
    ```bash
    cd frontend
    ```
2.  **Instalar paquetes:**
    ```bash
    npm install
    # Si hay error de dependencias legacy:
    # npm install --legacy-peer-deps
    ```
3.  **Configurar entorno (`.env`):**
    En la raíz de `frontend/`.
    *Template:*
    ```ini
    VITE_API_URL=http://localhost:8000/api
    VITE_APP_NAME="Risol Dev"
    ```
4.  **Correr desarrollo:**
    ```bash
    npm run dev
    ```
    Visita `http://localhost:5173`.

---

## 3. Anatomía del Código (Codebase Map)

Entender la topología del proyecto es clave para navegar rápido.

### 3.1 Backend Blueprint (`backend/`)

*   `manage.py`: Entry point de CLI Django.
*   `agroproductores_risol/`: **Configuración Core.**
    *   `settings.py`: Vars de entorno, apps instaladas, middleware.
    *   `urls.py`: Router principal.
*   `gestion_usuarios/`: **App de Identidad.**
    *   `models.py`: `Users` (AbstractBaseUser), `RegistroActividad`.
    *   `serializers.py`: JWT tokens, User profile.
*   `gestion_huerta/`: **App de Campo.**
    *   `models.py`: `Propietario`, `Huerta`, `Temporada`, `Cosecha` (Models grandes).
    *   `views/`: Dividido en módulos (`huerta_views.py`, `cosecha_views.py`) para evitar archivos de 5000 líneas.
*   `gestion_bodega/`: **App de Empaque.**
    *   `models.py`: `Bodega`, `Recepcion`, `Empaque`. Lógica pesada.
    *   `utils/`: `semana.py` (cálculo de fechas), `validators.py`.

### 3.2 Frontend Blueprint (`frontend/src/`)

*   `main.tsx`: Entry point. Providers (Redux, Theme, Router).
*   `App.tsx`: Layout base y Rutas protegidas.
*   `global/`: **Código compartido cross-module.**
    *   `api.ts`: Instancia Axios con interceptores (Auth header, Error handling).
    *   `store.ts`: Configuración del Redux Store.
    *   `types.ts`: Definiciones TS globales (`PaginationMeta`, `ApiResponse`).
*   `modules/`: **Dominios de Negocio (Verticales).**
    *   `gestion_usuarios/`: Login, Admin de usuarios.
    *   `gestion_huerta/`:
        *   `components/`: UI específica (HuertaForm, CosechaCard).
        *   `hooks/`: Lógica encapsulada (`useHuertas`, `useCosechas`).
        *   `slices/`: Redux slices (`huertasSlice.ts`).
        *   `services/`: Llamadas API puras (`huertasService.ts`).
    *   `gestion_bodega/`: Tablero, Recepciones, Reportes.
*   `components/`: **UI Kit Genérico.**
    *   `TableLayout.tsx`: Tabla estándar paginada.
    *   `ConfirmDialog.tsx`: Modal de "Estás seguro?".
    *   `MainLayout.tsx`: Sidebar, Navbar.

---

## 4. Backend Deep Dive: Guía de Implementación

### 4.1 Creando Modelos y Migraciones
1.  Define la clase en `models.py`. Asegura heredar de `TimeStampedModel`.
2.  Define `__str__` y `Meta` (ordering, indexes).
3.  Corre `python manage.py makemigrations`.
4.  Revisa el archivo generado en `migrations/`.
5.  Corre `python manage.py migrate`.

**Tip:** Si agregas campos a un modelo con datos existentes, provee un `default` o hazlo `null=True` inicialmente.

### 4.2 Serializers y Validaciones
Usamos `ModelSerializer` casi siempre.
*   **Validación de Campo:** Método `validate_nombre(self, value)`.
*   **Validación Cruzada:** Método `validate(self, data)`. Aquí revisas si `fecha_fin > fecha_inicio`.
*   **Campos Computados:** `serializers.SerializerMethodField`. Ej. `get_total_kilos(self, obj)`.

```python
class RecepcionSerializer(serializers.ModelSerializer):
    huerta_nombre = serializers.CharField(source='huerta.nombre', read_only=True)
    
    class Meta:
        model = Recepcion
        fields = ['id', 'huerta', 'huerta_nombre', 'kilos_netos']
        # read_only_fields = ...
```

### 4.3 ViewSets y Lógica de Negocio
Extendemos de `viewsets.ModelViewSet`.
*   **QuerySet:** Define `get_queryset(self)` para filtrar por reglas de seguridad (ej. solo activos).
*   **Permission:** `permission_classes = [IsAuthenticated]`.
*   **Pagination:** `GenericPagination` se aplica globalmente en settings, pero verifica.

**Custom Actions:**
Si necesitas un endpoint que no es CRUD estándar (ej. "Cerrar Cosecha"):
```python
@action(detail=True, methods=['post'], url_path='cerrar')
def cerrar_cosecha(self, request, pk=None):
    cosecha = self.get_object()
    try:
        cosecha.cerrar() # Lógica en el modelo
        return Response(create_response(success=True, message_key="COSECHA_CLOSED"))
    except ValidationError as e:
        return Response(create_error(e), status=400)
```

### 4.4 Rutas y URLs
Registra el ViewSet en `urls.py` usando `DefaultRouter`.
```python
router.register(r'cosechas', CosechaViewSet, basename='cosechas')
```
Esto genera automáticamente:
*   GET /cosechas/ (List)
*   POST /cosechas/ (Create)
*   GET /cosechas/{id}/ (Retrieve)
*   PUT/PATCH /cosechas/{id}/ (Update)
*   POST /cosechas/{id}/cerrar/ (Custom Action)

---

## 5. Frontend Deep Dive: Guía de Implementación

### 5.1 Arquitectura Redux (Duck Pattern / Slices)
Cada entidad tiene su Slice.
*   **State:**
    ```typescript
    initialState = {
        data: [],
        meta: null, 
        loading: false,
        error: null
    }
    ```
*   **Thunks:**
    ```typescript
    export const fetchCosechas = createAsyncThunk(
        'cosechas/fetch',
        async (params: any) => await cosechasService.getAll(params)
    );
    ```
*   **Reducer:** Maneja los estados `pending` (loading=true), `fulfilled` (data=payload), `rejected` (error=msg).

### 5.2 Servicios API (Axios + Types)
Los servicios son funciones puras. No guardan estado. Solo retornan Promesas.
```typescript
const getAll = async (params: QueryParams) => {
    const response = await api.get<ApiResponse<Cosecha[]>>('/cosechas/', { params });
    return response.data; // Devuelve el envelope completo o solo data dependiendo convención
};
```

### 5.3 Hooks Personalizados
Es la interfaz entre el componente react y Redux.
*   `useCosechas()`:
    *   `dispatch(fetchCosechas())` al montar (o bajo demanda).
    *   Selecciona `state.cosechas.data`.
    *   Retorna `{ cosechas, pagination, loading, refresh }`.

### 5.4 Componentes Visuales y Layout
*   Usa MUI Components (`<Box>`, `<Typography>`, `<Button>`) sobre HTML nativo.
*   Usa el sistema de Grid de MUI o Flexbox.
*   **TableLayout:** Pásale las columnas y la data. No hagas loops `.map` manuales para tablas estándar.

---

## 6. Scripts de Auditoría y QA

En la carpeta raíz o `backend/utils/auditoria/`:
1.  **`check_docs_source_of_truth.py`**:
    *   Corre: `python check_docs_source_of_truth.py`
    *   Propósito: Asegura integridad documental.
2.  **`check_ui_transforms.py`** (Future):
    *   Propósito: Escanea `.tsx` buscando `filter()` prohibidos.

---

## 7. Snippets y Recetas Comunes

### 7.1 Receta: Nuevo Filtro en Listado
1.  **Backend:** Agregar campo en `filterset_fields` del ViewSet.
2.  **Frontend (Service):** Asegurar que la interfaz `QueryParams` acepte el nuevo campo.
3.  **Frontend (Hook):** Exponer función `filterBy(criterio)`.
4.  **Frontend (UI):** Agregar un `<Select>` o `<TextField>` que llame a `filterBy`.

### 7.2 Receta: Debuggear Error 500
1.  Verifica la terminal donde corre Django (`runserver`). Ahí sale el Stack Trace completo.
2.  Si es "IntegrityError", probablemente violaste un Unique Constraint o Foreign Key.
3.  Si es "DoesNotExist", intentaste acceder a un objeto ID que no existe (o está filtrado por queryset).

---

## 8. Troubleshooting (FAQ Técnico)

**P: `npm install` falla con conflictos de dependencias.**
R: Usa `npm install --legacy-peer-deps`. Algunas librerías de UI pueden tener versiones peer estrictas viejas.

**P: No veo mis cambios de CSS/Estilo.**
R: Vite hace HMR (Hot Module Replacement). A veces falla. Recarga la página manualmente. Si persiste, borra `node_modules/.vite`.

**P: CORS Error en consola.**
R: El backend no está permitiendo el origen del frontend. Revisa `CORS_ALLOWED_ORIGINS` en `settings.py`. Asegúrate que sea `http://localhost:5173` (sin slash final a veces).

**P: El Token expira muy rápido.**
R: En desarrollo, puedes aumentar el tiempo de vida del token en `settings.py` (SIMPLE_JWT settings) o simplemente volver a loguearte. En producción es de 24h.

---
**Fin del Manual.**
¡Feliz Codificación! Build something great.
