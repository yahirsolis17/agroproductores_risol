# Sistema de Gestión Agrícola - Agroproductores Risol

## 📋 Descripción

Sistema integral de gestión agrícola desarrollado con Django REST Framework y React + TypeScript. Permite la administración completa de huertas propias y rentadas, control de temporadas, cosechas, inversiones y ventas.

## 🏗️ Arquitectura del Sistema

### Backend (Django REST Framework)
- **Framework**: Django 5.0.6 con Django REST Framework
- **Base de datos**: MySQL
- **Autenticación**: JWT (Simple JWT)
- **Documentación API**: DRF Spectacular (Swagger/ReDoc)

### Frontend (React + TypeScript)
- **Framework**: React 19.0.0 con TypeScript
- **Build Tool**: Vite 6.2.0
- **UI Framework**: Material-UI (MUI) 7.0.2
- **Estilos**: Tailwind CSS 3.3.3
- **Estado**: Redux Toolkit 2.6.1
- **Formularios**: Formik + Yup
- **Animaciones**: Framer Motion

## 📁 Estructura del Proyecto

```
agroproductores_risol/
├── backend/                    # API Django REST Framework
│   ├── agroproductores_risol/  # Configuración principal
│   │   ├── settings.py         # Configuración Django
│   │   ├── urls.py            # URLs principales
│   │   ├── middlewares/       # Middlewares personalizados
│   │   └── utils/             # Utilidades compartidas
│   ├── gestion_usuarios/      # Módulo de usuarios
│   ├── gestion_huerta/        # Módulo de huertas
│   ├── gestion_bodega/        # Módulo de bodegas
│   ├── gestion_venta/         # Módulo de ventas
│   └── requirements.txt       # Dependencias Python
├── frontend/                  # Aplicación React
│   ├── src/
│   │   ├── components/        # Componentes reutilizables
│   │   ├── modules/          # Módulos por funcionalidad
│   │   ├── global/           # Configuración global
│   │   │   ├── api/          # Configuración API
│   │   │   ├── routes/       # Enrutamiento
│   │   │   ├── store/        # Estado global (Redux)
│   │   │   └── utils/        # Utilidades
│   │   └── assets/           # Recursos estáticos
│   └── package.json          # Dependencias Node.js
└── README.md                 # Este archivo
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Python 3.8+
- Node.js 16+
- MySQL 8.0+
- Git

### Configuración del Backend

1. **Clonar el repositorio**
```bash
git clone https://github.com/yahirsolis17/agroproductores_risol.git
cd agroproductores_risol
```

2. **Configurar entorno virtual Python**
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

3. **Instalar dependencias**
```bash
pip install -r requirements.txt
```

4. **Configurar base de datos MySQL**
```sql
CREATE DATABASE agroproductores_risol;
CREATE USER 'yahir'@'localhost' IDENTIFIED BY '1234';
GRANT ALL PRIVILEGES ON agroproductores_risol.* TO 'yahir'@'localhost';
FLUSH PRIVILEGES;
```

5. **Ejecutar migraciones**
```bash
python manage.py makemigrations
python manage.py migrate
```

6. **Crear superusuario**
```bash
python manage.py createsuperuser
```

7. **Ejecutar servidor de desarrollo**
```bash
python manage.py runserver
```

### Configuración del Frontend

1. **Instalar dependencias**
```bash
cd frontend
npm install
```

2. **Ejecutar servidor de desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en:
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/api/docs/swagger/

## 📊 Módulos del Sistema

### 1. Gestión de Usuarios (`gestion_usuarios`)
- **Autenticación**: Login/logout con JWT
- **Roles**: Administrador y Usuario
- **Funcionalidades**:
  - CRUD de usuarios
  - Gestión de permisos por rol
  - Registro de actividad
  - Soft delete (archivado)
  - Control de intentos fallidos
  - Cambio obligatorio de contraseña

**Modelos principales**:
- `Users`: Usuario personalizado con teléfono como identificador
- `RegistroActividad`: Log de actividades del usuario

### 2. Gestión de Huertas (`gestion_huerta`)
- **Propietarios**: Gestión de propietarios de huertas
- **Huertas**: Propias y rentadas
- **Temporadas**: Ciclos agrícolas anuales
- **Cosechas**: Cultivos por temporada
- **Inversiones**: Control de gastos (insumos, mano de obra)
- **Ventas**: Registro de ventas por cosecha

**Modelos principales**:
- `Propietario`: Datos del propietario
- `Huerta`: Huertas propias
- `HuertaRentada`: Huertas en renta
- `Temporada`: Ciclo agrícola anual
- `Cosecha`: Cultivos específicos
- `InversionesHuerta`: Gastos e inversiones
- `Venta`: Registro de ventas
- `CategoriaInversion`: Categorías de gastos

### 3. Gestión de Bodegas (`gestion_bodega`)
- Control de inventario
- Almacenamiento de productos

### 4. Gestión de Ventas (`gestion_venta`)
- Registro detallado de ventas
- Cálculo de ganancias netas
- Reportes de ventas

## 🔧 Características Técnicas

### Backend
- **Autenticación JWT** con tokens de acceso y refresh
- **Soft Delete** en todos los modelos principales
- **Throttling** personalizado para diferentes endpoints
- **Paginación** genérica configurable
- **Logging** detallado de actividades
- **Middlewares** de seguridad personalizados
- **Validaciones** robustas con Django validators
- **API RESTful** completamente documentada

### Frontend
- **Arquitectura modular** por funcionalidades
- **Componentes reutilizables** con Material-UI
- **Estado global** gestionado con Redux Toolkit
- **Formularios** validados con Formik + Yup
- **Routing** dinámico con React Router
- **Responsive design** con Tailwind CSS
- **TypeScript** para tipado estático
- **Animaciones** fluidas con Framer Motion

## 🔒 Seguridad

- **Autenticación JWT** con rotación de tokens
- **CORS** configurado para desarrollo
- **Middleware de seguridad** personalizado
- **Validación de entrada** en todos los endpoints
- **Control de acceso** basado en roles
- **Registro de actividades** para auditoría
- **Soft delete** para preservar datos históricos

## 📈 Funcionalidades Principales

### Dashboard
- Resumen de huertas activas
- Estadísticas de temporadas
- Indicadores de rendimiento

### Gestión de Huertas
- ✅ Registro de huertas propias y rentadas
- ✅ Control de temporadas por año
- ✅ Gestión de cosechas múltiples
- ✅ Seguimiento de inversiones detallado
- ✅ Registro de ventas con cálculo automático de ganancias

### Reportes e Informes
- 📊 Rentabilidad por huerta
- 📊 Análisis de costos vs ingresos
- 📊 Comparativas entre temporadas
- 📊 Reportes de productividad

### Administración
- 👥 Gestión completa de usuarios
- 🔐 Control de permisos granular
- 📝 Registro de actividades
- 🗃️ Archivado y restauración de datos

## 🛠️ Scripts Disponibles

### Backend
```bash
python manage.py runserver          # Servidor de desarrollo
python manage.py makemigrations     # Crear migraciones
python manage.py migrate            # Aplicar migraciones
python manage.py test               # Ejecutar tests
python manage.py collectstatic      # Recopilar archivos estáticos
```

### Frontend
```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run preview    # Preview del build
npm run lint       # Linter ESLint
```

## 🌐 API Endpoints

### Autenticación
- `POST /api/token/` - Obtener token JWT
- `POST /api/token/refresh/` - Renovar token
- `POST /api/token/verify/` - Verificar token

### Usuarios
- `GET /usuarios/` - Listar usuarios
- `POST /usuarios/` - Crear usuario
- `GET /usuarios/{id}/` - Detalle usuario
- `PUT /usuarios/{id}/` - Actualizar usuario
- `DELETE /usuarios/{id}/` - Archivar usuario

### Huertas
- `GET /huerta/` - Listar huertas
- `POST /huerta/` - Crear huerta
- `GET /huerta/{id}/` - Detalle huerta
- `PUT /huerta/{id}/` - Actualizar huerta

*Para documentación completa de la API, visitar: http://localhost:8000/api/docs/swagger/*

## 🧪 Testing

El proyecto incluye tests unitarios para:
- Modelos de datos
- Serializers
- Vistas de API
- Validadores personalizados
- Permisos y autenticación

```bash
# Ejecutar todos los tests
python manage.py test

# Tests específicos por módulo
python manage.py test gestion_usuarios
python manage.py test gestion_huerta
```

## 📝 Configuración de Desarrollo

### Variables de Entorno
Crear archivo `.env` en el directorio backend:
```env
DEBUG=True
SECRET_KEY=tu-clave-secreta
DB_NAME=agroproductores_risol
DB_USER=yahir
DB_PASSWORD=1234
DB_HOST=localhost
DB_PORT=3306
```

### CORS para Desarrollo
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Frontend Vite
    "http://127.0.0.1:5173",
]
```

## 🚀 Despliegue en Producción

### Backend (Django)
1. Configurar variables de entorno de producción
2. Ejecutar `python manage.py collectstatic`
3. Configurar servidor web (Nginx + Gunicorn)
4. Configurar base de datos de producción

### Frontend (React)
1. Ejecutar `npm run build`
2. Servir archivos estáticos desde `dist/`
3. Configurar proxy reverso para API

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto es privado y pertenece a Agroproductores Risol.

## 👨‍💻 Desarrollador

**Yahir Solis**
- GitHub: [@yahirsolis17](https://github.com/yahirsolis17)
- Email: yahir.solis@example.com

## 📞 Soporte

Para soporte técnico o consultas sobre el sistema, contactar al desarrollador o crear un issue en el repositorio.

---

*Última actualización: Enero 2025*
