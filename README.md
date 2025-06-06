# Agroproductores Risol

**Agroproductores Risol** es una aplicación web de gestión agrícola formada por dos proyectos principales:

- **backend/** – API REST desarrollada con Django 5 y Django REST Framework.
- **frontend/** – Interfaz de usuario construida con React, TypeScript y Vite.

El propósito de la aplicación es administrar huertas propias o rentadas, registrar cosechas, ventas e inversiones y llevar el control de usuarios y permisos.

## Tabla de contenidos

1. [Estructura del proyecto](#estructura-del-proyecto)
2. [Backend](#backend)
3. [Frontend](#frontend)
4. [Puesta en marcha](#puesta-en-marcha)
5. [Licencia](#licencia)

## Estructura del proyecto

```
.
├── backend/   # Código del servidor Django
│   ├── agroproductores_risol/   # Proyecto base y middlewares
│   ├── gestion_huerta/          # Módulo para huertas, cosechas, temporadas…
│   ├── gestion_bodega/          # (placeholder)
│   ├── gestion_venta/           # (placeholder)
│   ├── gestion_usuarios/        # Autenticación y gestión de usuarios
│   └── requirements.txt         # Dependencias de Python
└── frontend/  # Aplicación React + Vite
    ├── src/
    │   ├── modules/gestion_huerta
    │   └── modules/gestion_usuarios
    └── package.json
```

Cada carpeta incluye un archivo `estructura_limpia.txt` con un listado más detallado de los archivos del módulo.

## Backend

El backend expone una API REST. Usa MySQL como base de datos y está configurado para autenticación con JSON Web Tokens (JWT). Entre las dependencias principales se encuentran `Django==5.0.6`, `djangorestframework`, `djangorestframework_simplejwt` y `drf_spectacular` para la documentación automática.

### Aplicaciones incluidas

- **gestion_huerta** – modelos y vistas para propietarios, huertas (propias o rentadas), temporadas, cosechas, inversiones y ventas.
- **gestion_usuarios** – modelo de usuario personalizado, roles, permisos y registro de actividad.
- **gestion_bodega** y **gestion_venta** – módulos preparados para futuras funcionalidades.

Los endpoints principales se agrupan mediante `DefaultRouter` y están disponibles bajo rutas como `/huerta/`, `/usuarios/`, etc. La documentación interactiva se genera con DRF Spectacular en `/api/docs/swagger/` y `/api/docs/redoc/`.

### Configuración básica

1. Crear y activar un entorno virtual de Python.
2. Instalar dependencias: `pip install -r backend/requirements.txt`.
3. Ajustar los parámetros de base de datos en `backend/agroproductores_risol/settings.py` si es necesario.
4. Aplicar migraciones: `python manage.py migrate` (desde `backend/`).
5. Crear un superusuario: `python manage.py createsuperuser`.
6. Ejecutar el servidor: `python manage.py runserver`.

## Frontend

La interfaz está hecha con **React** y **TypeScript** utilizando **Vite** como bundler. Usa Material UI (MUI), TailwindCSS y Redux Toolkit para el estado global. Las secciones principales viven dentro de `src/modules` y se dividen en `gestion_huerta` y `gestion_usuarios`.

### Instalación

```
cd frontend
npm install
npm run dev
```

La aplicación quedará disponible típicamente en `http://localhost:5173` y consume la API del backend.

## Puesta en marcha

1. Arrancar el **backend** siguiendo los pasos de la sección anterior.
2. En otra terminal, iniciar el **frontend** con `npm run dev`.
3. Visitar `http://localhost:5173` e iniciar sesión con las credenciales creadas.

## Licencia

Este proyecto se distribuye bajo los términos de la licencia que decida el propietario del repositorio.
