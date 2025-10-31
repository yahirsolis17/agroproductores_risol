# Instrucciones Copilot - Sistema de Gestión Agrícola Risol

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
- **Backend**: Django 5.0.6 + DRF (API REST)
- **Frontend**: React 19 + TypeScript + MUI
- **Base de datos**: MySQL 8.0+
- **Autenticación**: JWT

### Estructura Modular
```
backend/
├── gestion_usuarios/    # Autenticación y usuarios
├── gestion_huerta/     # Huertas y temporadas
├── gestion_bodega/     # Inventario y almacenes
└── gestion_venta/      # Ventas y finanzas

frontend/
├── components/         # Componentes reutilizables
├── modules/           # Módulos por funcionalidad
└── global/           # Config global (API, rutas, estado)
```

## 🔑 Convenciones Críticas

### Backend (Django/DRF)

#### Modelos
- Implementar **soft delete** con campo `is_active` en todos los modelos
- Usar `related_name` en todas las relaciones ForeignKey
- Incluir campos de auditoría (`created_at`, `updated_at`)

```python
class BaseModel(models.Model):
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True
```

#### API Views
- Usar `ViewSets` con mixins apropiados
- Implementar filtros y búsqueda con `DjangoFilterBackend`
- Incluir paginación con `utils.pagination.CustomPageNumberPagination`

#### Permisos
- Usar clases en `permissions.py` para cada módulo
- Verificar `is_admin` en niveles críticos
- Ver ejemplos en `gestion_usuarios/permissions.py`

### Frontend (React/TypeScript)

#### Componentes
- Nombrar archivos: `PascalCase` para componentes, `camelCase` para utilidades
- Props tipadas con interfaces explícitas
- Usar Material-UI para consistencia visual

```typescript
interface DataTableProps<T> {
  data: T[];
  columns: TableColumn[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
}
```

#### Estado Global
- Redux Toolkit para estado compartido
- Hooks personalizados por funcionalidad en `hooks/`
- Servicios API en `services/` usando `apiClient`

## 🔄 Flujos de Trabajo Clave

### Autenticación
1. Login vía `/api/token/` con teléfono+password
2. Almacenar tokens JWT en localStorage
3. Incluir token en header `Authorization: Bearer <token>`
4. Renovar con `/api/token/refresh/` antes de expiración

### Gestión de Datos
- Implementar soft delete - nunca borrar registros
- Validar permisos en frontend y backend
- Usar transacciones para operaciones múltiples
- Cachear datos frecuentes con `cache_keys.py`

### Reportes
- Usar servicios en `services/reportes/` 
- Implementar paginación para grandes conjuntos
- Cachear resultados costosos
- Ver patrones en `REPORTES_PRODUCCION_IMPLEMENTACION.md`

## 🛠️ Herramientas de Desarrollo

### Comandos Críticos
```bash
# Backend
python manage.py runserver
python manage.py test gestion_huerta  # tests por módulo
python manage.py makemigrations
python manage.py migrate

# Frontend
npm run dev           # desarrollo
npm run build        # producción
npm run test         # tests
```

### Debugging
- Django Debug Toolbar en desarrollo
- Logs en `settings.DEBUG = True`
- Redux DevTools para estado frontend
- Ver `DEVELOPMENT_GUIDE.md` para más detalles

## 📝 Notas Importantes

1. **Permisos**: Implementar siempre a nivel de modelo Y vista
2. **Validación**: Backend Y frontend para datos críticos
3. **Optimización**: Usar `select_related`/`prefetch_related` para consultas N+1
4. **Testing**: Requerido para modelos, serializers y vistas críticas
5. **Documentación**: Mantener Swagger/ReDoc actualizado

## 📚 Archivos Clave

- `backend/gestion_huerta/models.py`: Modelos principales de negocio
- `backend/gestion_usuarios/permissions.py`: Permisos base
- `frontend/src/global/api/apiClient.ts`: Config API y manejo de errores
- `docs/DEVELOPMENT_GUIDE.md`: Guía detallada de desarrollo

---
Consulta la documentación completa en `/docs` para más detalles.