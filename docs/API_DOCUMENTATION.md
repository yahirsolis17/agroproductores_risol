# Documentación de API - Agroproductores Risol

## 📋 Información General

Esta documentación describe los endpoints disponibles en la API REST del sistema de gestión agrícola.

**Base URL**: `http://localhost:8000`
**Autenticación**: JWT Bearer Token
**Formato**: JSON

## 🔐 Autenticación

### Obtener Token JWT
```http
POST /api/token/
Content-Type: application/json

{
    "telefono": "1234567890",
    "password": "tu_password"
}
```

**Respuesta exitosa:**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Renovar Token
```http
POST /api/token/refresh/
Content-Type: application/json

{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Verificar Token
```http
POST /api/token/verify/
Content-Type: application/json

{
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

## 👥 Gestión de Usuarios

### Listar Usuarios
```http
GET /usuarios/
Authorization: Bearer {token}
```

**Parámetros de consulta:**
- `page`: Número de página (default: 1)
- `page_size`: Elementos por página (default: 10)
- `search`: Búsqueda por nombre, apellido o teléfono
- `role`: Filtrar por rol (admin, usuario)
- `is_active`: Filtrar por estado (true, false)

**Respuesta:**
```json
{
    "count": 25,
    "next": "http://localhost:8000/usuarios/?page=2",
    "previous": null,
    "results": [
        {
            "id": 1,
            "nombre": "Juan",
            "apellido": "Pérez",
            "telefono": "1234567890",
            "role": "admin",
            "is_active": true,
            "archivado_en": null,
            "intentos_fallidos": 0,
            "must_change_password": false
        }
    ]
}
```

### Crear Usuario
```http
POST /usuarios/
Authorization: Bearer {token}
Content-Type: application/json

{
    "nombre": "María",
    "apellido": "González",
    "telefono": "0987654321",
    "password": "password123",
    "role": "usuario"
}
```

### Obtener Usuario
```http
GET /usuarios/{id}/
Authorization: Bearer {token}
```

### Actualizar Usuario
```http
PUT /usuarios/{id}/
Authorization: Bearer {token}
Content-Type: application/json

{
    "nombre": "María Elena",
    "apellido": "González López",
    "role": "admin"
}
```

### Archivar Usuario (Soft Delete)
```http
DELETE /usuarios/{id}/
Authorization: Bearer {token}
```

### Desarchivar Usuario
```http
POST /usuarios/{id}/desarchivar/
Authorization: Bearer {token}
```

### Cambiar Contraseña
```http
POST /usuarios/{id}/cambiar-password/
Authorization: Bearer {token}
Content-Type: application/json

{
    "old_password": "password_actual",
    "new_password": "nuevo_password"
}
```

## 🌱 Gestión de Huertas

### Propietarios

#### Listar Propietarios
```http
GET /huerta/propietarios/
Authorization: Bearer {token}
```

#### Crear Propietario
```http
POST /huerta/propietarios/
Authorization: Bearer {token}
Content-Type: application/json

{
    "nombre": "Carlos",
    "apellidos": "Ramírez Sánchez",
    "telefono": "5551234567",
    "direccion": "Calle Principal #123, Colonia Centro"
}
```

### Huertas Propias

#### Listar Huertas
```http
GET /huerta/huertas/
Authorization: Bearer {token}
```

**Parámetros de consulta:**
- `propietario`: ID del propietario
- `is_active`: Filtrar por estado
- `search`: Búsqueda por nombre o ubicación

#### Crear Huerta
```http
POST /huerta/huertas/
Authorization: Bearer {token}
Content-Type: application/json

{
    "nombre": "Huerta San José",
    "ubicacion": "Parcela 15, Ejido La Esperanza",
    "variedades": "Mango Manila, Mango Ataulfo",
    "hectareas": 2.5,
    "propietario": 1,
    "historial": "Huerta establecida en 2020"
}
```

### Huertas Rentadas

#### Listar Huertas Rentadas
```http
GET /huerta/huertas-rentadas/
Authorization: Bearer {token}
```

#### Crear Huerta Rentada
```http
POST /huerta/huertas-rentadas/
Authorization: Bearer {token}
Content-Type: application/json

{
    "nombre": "Huerta El Paraíso",
    "ubicacion": "Km 5 Carretera a Tepic",
    "variedades": "Mango Tommy",
    "hectareas": 1.8,
    "propietario": 2,
    "monto_renta": 15000.00
}
```

### Temporadas

#### Listar Temporadas
```http
GET /huerta/temporadas/
Authorization: Bearer {token}
```

**Parámetros de consulta:**
- `año`: Filtrar por año
- `huerta`: ID de huerta propia
- `huerta_rentada`: ID de huerta rentada
- `finalizada`: Filtrar por estado (true, false)

#### Crear Temporada
```http
POST /huerta/temporadas/
Authorization: Bearer {token}
Content-Type: application/json

{
    "año": 2024,
    "huerta": 1,
    "fecha_inicio": "2024-01-15"
}
```

#### Finalizar Temporada
```http
POST /huerta/temporadas/{id}/finalizar/
Authorization: Bearer {token}
```

### Cosechas

#### Listar Cosechas
```http
GET /huerta/cosechas/
Authorization: Bearer {token}
```

#### Crear Cosecha
```http
POST /huerta/cosechas/
Authorization: Bearer {token}
Content-Type: application/json

{
    "nombre": "Cosecha Mango 2024",
    "temporada": 1,
    "huerta": 1,
    "fecha_inicio": "2024-03-01T08:00:00Z"
}
```

### Inversiones

#### Listar Inversiones
```http
GET /huerta/inversiones/
Authorization: Bearer {token}
```

#### Crear Inversión
```http
POST /huerta/inversiones/
Authorization: Bearer {token}
Content-Type: application/json

{
    "fecha": "2024-03-15",
    "descripcion": "Aplicación de fertilizante NPK",
    "gastos_insumos": 2500.00,
    "gastos_mano_obra": 800.00,
    "categoria_id": 1,
    "cosecha_id": 1,
    "huerta_id": 1,
    "temporada_id": 1
}
```

### Ventas

#### Listar Ventas
```http
GET /huerta/ventas/
Authorization: Bearer {token}
```

#### Crear Venta
```http
POST /huerta/ventas/
Authorization: Bearer {token}
Content-Type: application/json

{
    "cosecha": 1,
    "huerta_id": 1,
    "temporada_id": 1,
    "fecha_venta": "2024-05-20",
    "num_cajas": 150,
    "precio_por_caja": 180,
    "tipo_mango": "Manila Primera",
    "descripcion": "Venta a mayorista local",
    "gasto": 2000
}
```

## 📊 Reportes e Informes

### Resumen de Huerta
```http
GET /huerta/huertas/{id}/resumen/
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
    "huerta": {
        "id": 1,
        "nombre": "Huerta San José",
        "hectareas": 2.5
    },
    "temporadas_activas": 1,
    "cosechas_activas": 2,
    "total_inversiones": 15000.00,
    "total_ventas": 45000.00,
    "ganancia_neta": 30000.00,
    "roi": 200.0
}
```

### Análisis de Temporada
```http
GET /huerta/temporadas/{id}/analisis/
Authorization: Bearer {token}
```

### Rentabilidad por Cosecha
```http
GET /huerta/cosechas/{id}/rentabilidad/
Authorization: Bearer {token}
```

## 📦 Gestión de Bodegas

### Listar Productos en Bodega
```http
GET /bodega/productos/
Authorization: Bearer {token}
```

### Registrar Entrada
```http
POST /bodega/entradas/
Authorization: Bearer {token}
Content-Type: application/json

{
    "producto": "Mango Manila",
    "cantidad": 100,
    "fecha_entrada": "2024-05-20",
    "cosecha": 1
}
```

### Registrar Salida
```http
POST /bodega/salidas/
Authorization: Bearer {token}
Content-Type: application/json

{
    "producto": "Mango Manila",
    "cantidad": 80,
    "fecha_salida": "2024-05-22",
    "destino": "Venta directa"
}
```

## 💰 Gestión de Ventas

### Listar Todas las Ventas
```http
GET /venta/ventas/
Authorization: Bearer {token}
```

### Reporte de Ventas por Período
```http
GET /venta/reportes/periodo/
Authorization: Bearer {token}
```

**Parámetros de consulta:**
- `fecha_inicio`: Fecha de inicio (YYYY-MM-DD)
- `fecha_fin`: Fecha de fin (YYYY-MM-DD)
- `huerta`: ID de huerta (opcional)
- `tipo_mango`: Tipo de mango (opcional)

## 🔍 Filtros y Búsquedas

### Parámetros Comunes
- `search`: Búsqueda de texto libre
- `ordering`: Ordenamiento (`campo` o `-campo` para descendente)
- `page`: Número de página
- `page_size`: Elementos por página (máximo 100)

### Filtros por Fecha
- `fecha_inicio`: Fecha de inicio (YYYY-MM-DD)
- `fecha_fin`: Fecha de fin (YYYY-MM-DD)
- `año`: Filtrar por año

### Filtros por Estado
- `is_active`: true/false
- `finalizada`: true/false (para temporadas y cosechas)
- `archivado`: true/false

## ⚠️ Códigos de Error

### Errores de Autenticación
- `401 Unauthorized`: Token inválido o expirado
- `403 Forbidden`: Sin permisos para la acción

### Errores de Validación
- `400 Bad Request`: Datos inválidos
- `404 Not Found`: Recurso no encontrado
- `409 Conflict`: Conflicto de datos (ej. teléfono duplicado)

### Errores del Servidor
- `500 Internal Server Error`: Error interno del servidor
- `503 Service Unavailable`: Servicio no disponible

## 🚦 Rate Limiting

La API implementa limitación de velocidad:
- **Login**: 5 intentos por minuto
- **Acciones sensibles**: 10 por hora
- **Usuarios generales**: 10,000 por día
- **Refresh token**: 5 por hora
- **Permisos**: 6 por minuto

## 📝 Notas Importantes

1. **Soft Delete**: Los recursos eliminados se marcan como inactivos, no se borran físicamente
2. **Paginación**: Todos los listados están paginados por defecto
3. **Timestamps**: Todas las fechas están en formato ISO 8601 UTC
4. **Validaciones**: Los campos tienen validaciones específicas (teléfono 10 dígitos, etc.)
5. **Relaciones**: Al eliminar un recurso padre, los hijos se archivan automáticamente

## 🔗 Enlaces Útiles

- **Swagger UI**: http://localhost:8000/api/docs/swagger/
- **ReDoc**: http://localhost:8000/api/docs/redoc/
- **Admin Panel**: http://localhost:8000/admin/

---

*Para más información, consultar la documentación interactiva en Swagger UI*
