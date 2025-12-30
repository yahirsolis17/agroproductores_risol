# Agroproductores Risol — Documentación Maestra del Proyecto (Whitepaper Técnico y Operativo)

> **Versión del Documento:** 2.0 (Canon Estricto)  
> **Última Actualización:** Diciembre 2025  
> **Estado:** Producción / Fase de Expansión  
> **Clasificación:** Confidencial / Uso Interno  

---

## Índice de Contenidos

1.  [Visión General y Propósito del Sistema](#1-visión-general-y-propósito-del-sistema)
    *   1.1 Resumen Ejecutivo
    *   1.2 La Problemática ("Dolores")
    *   1.3 La Solución ("Resultados")
2.  [Arquitectura del Sistema](#2-arquitectura-del-sistema)
    *   2.1 Backend (Django + DRF)
    *   2.2 Frontend (React + Vite + TS)
    *   2.3 Base de Datos (MySQL)
    *   2.4 Infraestructura
3.  [Modelo de Dominio y Reglas de Negocio (Backend)](#3-modelo-de-dominio-y-reglas-de-negocio-backend)
    *   3.1 Gestión de Usuarios y Seguridad
    *   3.2 Gestión de Huerta (Campo)
    *   3.3 Gestión de Bodega (Empaque y Transformación)
    *   3.4 Finanzas y Cierre
4.  [Diccionario de Datos Detallado (Data Dictionary)](#4-diccionario-de-datos-detallado-data-dictionary)
    *   4.1 Módulo Usuarios
    *   4.2 Módulo Huerta
    *   4.3 Módulo Bodega
5.  [Operación del Sistema (Manual de Procedimientos)](#5-operación-del-sistema-manual-de-procedimientos)
    *   5.1 Procedimientos de Inicio
    *   5.2 Procedimientos de Campo
    *   5.3 Procedimientos de Bodega
    *   5.4 Procedimientos Administrativos
6.  [Glosario de Términos](#6-glosario-de-términos)
7.  [Anexos Tecnicos](#7-anexos-tecnicos)

---

## 1. Visión General y Propósito del Sistema

### 1.1 Resumen Ejecutivo
**Agroproductores Risol** es un sistema empresarial integral (full-stack ERP) diseñado a medida para cubrir la vertical de negocio de una **Agroproductora y Empacadora de Mango** en México.

A diferencia de un ERP genérico, Risol está modelado para entender la naturaleza biológica y temporal del negocio: las huertas tienen temporadas, las temporadas tienen cosechas, y las cosechas son entes vivos que se abren, producen gastos e ingresos, y se cierran. La bodega no es solo un almacén, es una planta de transformación donde la materia prima (fruta de campo) se convierte en producto terminado (cajas) o merma, con reglas estrictas de balance de masa y cierres semanales.

El sistema fue construido con una filosofía de **"Cero Bifurcaciones"** y **"Single Source of Truth"**. Elimina la operación basada en hojas de cálculo dispersas, libretas manuales y comunicación informal, centralizando todo en una base de datos relacional auditada.

### 1.2 La Problemática ("Dolores")
Antes de la implementación de Risol, la operación sufría de:

1.  **Información Fragmentada:**
    *   El campo reportaba cortes por WhatsApp.
    *   La bodega registraba entradas en notas de remisión de papel.
    *   La nómina se calculaba en Excel.
    *   El inventario real nunca coincidía con el teórico hasta el conteo físico de fin de mes.

2.  **Falta de Trazabilidad Financiera:**
    *   Era imposible responder con certeza: *"¿Fue rentable la cosecha de la Huerta El Milagro en 2023?"*. Los gastos estaban mezclados en una "bolsa general" y las ventas no se vinculaban específicamente a ese origen.

3.  **Riesgos de Integridad:**
    *   Registros duplicados (dos "Juan Pérez" como propietarios).
    *   Eliminación accidental de datos históricos.
    *   Ventas de producto que teóricamente no existía en inventario.

4.  **Dependencia Operativa:**
    *   Solo una o dos personas clave "sabían cómo estaba todo". Si faltaban, la operación administrativa se detenía.

### 1.3 La Solución ("Resultados")
Risol implementa:

1.  **Control Total del Ciclo de Vida:**
    *   Desde que se planta el árbol (Huerta) hasta que se cobra la factura (Venta), cada paso está digitalizado.

2.  **Auditoría Forense Nativa:**
    *   Cada acción crítica (crear, editar, archivar, cerrar semana) queda registrada en `RegistroActividad` con usuario, timestamp y snapshot de datos.

3.  **Cierres de Hierro (Hard Closures):**
    *   La operación se divide en Semanas. Una vez cerrada una semana, sus datos son inmutables. Esto garantiza que los reportes financieros generados hoy sean idénticos a los generados dentro de 5 años.

4.  **UI/UX Premium:**
    *   Una interfaz moderna que reduce la curva de aprendizaje y errores de captura, validando datos en tiempo real contra las reglas de negocio del backend.

---

## 2. Arquitectura del Sistema

El sistema sigue una arquitectura monolítica modular, priorizando la consistencia y la integridad transaccional sobre la distribución prematura.

### 2.1 Backend (Django + DRF)
El cerebro del sistema. Escrito en Python 3.10+ usando Django 4.2+.

*   **Principio de Responsabilidad:** El Backend es el único autorizado para validar reglas de negocio, calcular estados y persistir datos.
*   **API REST:** Expone una interfaz JSON predecible y documentada.
*   **Apps:**
    *   `gestion_usuarios`: Autenticación y control de acceso.
    *   `gestion_huerta`: Lógica de producción agrícola.
    *   `gestion_bodega`: Lógica de planta de empaque.
*   **Seguridad:**
    *   Autenticación por Token.
    *   Permisos granulares (RBAC).
    *   Validación estricta de inputs (Sanitización).

### 2.2 Frontend (React + Vite + TS)
La cara del sistema. Una Single Page Application (SPA) moderna.

*   **Tecnologías:** React 18, TypeScript, Redux Toolkit, Material UI v5, React Query (migrando a RTK Thunks por canon).
*   **Estado:** Redux como "Single Source of Truth" en el cliente.
*   **Patrones:**
    *   **Container/Presenter:** Separación clara entre lógica de datos y visualización.
    *   **Hooks Custom:** Encapsulamiento de reglas de UI (`useEmpaques`, `useCierreSemanal`).

### 2.3 Base de Datos (MySQL)
Almacén persistente relacional.

*   **Integridad Refencial:** Claves foráneas con restricciones `ON DELETE PROTECT` para evitar borrados en cascada accidentales.
*   **Índices:** Optimizados para las consultas más frecuentes (filtrado por `is_active`, `fecha`, `bodega_id`).
*   **Transacciones:** Uso de `atomic()` para asegurar operaciones complejas (ej. Cierre de Semana).

### 2.4 Infraestructura
*   **Servidor de Aplicación:** Gunicorn tras Nginx.
*   **Servidor de Base de Datos:** Gestionado (RDS o local optimizado).
*   **Almacenamiento de Archivos:** Local para desarrollo, S3/Azure Blob para producción (configuración agnóstica).

---

## 3. Modelo de Dominio y Reglas de Negocio (Backend)

### 3.1 Gestión de Usuarios y Seguridad

#### 3.1.1 Usuarios (`Users`)
*   **Identidad:** El sistema identifica usuarios por su número de teléfono celular (10 dígitos). Es un identificador único, personal e inmutable en la práctica.
*   **Roles:**
    *   `ADMIN`: Acceso irrestricto a configuración, usuarios y reportes sensibles.
    *   `USER`: Acceso operativo estándar.
*   **Estado:** `is_active` controla el acceso. `archivado_en` indica borrado lógico.

#### 3.1.2 Auditoría (`RegistroActividad`)
*   **Disparadores:** Se generan registros automáticamente en `create`, `update`, `archivar`, `desarchivar` y acciones custom (`cerrar_semana`).
*   **Contenido:**
    *   Actor (Usuario).
    *   Verbo (Acción).
    *   Sujeto (Entidad afectada).
    *   Detalle (JSON diff o resumen).

### 3.2 Gestión de Huerta (Campo)

#### 3.2.1 Jerarquía de Entidades
1.  **Propietario:** Dueño legal de la tierra.
2.  **Huerta:** Parcela física. Puede ser Propia o Rentada.
3.  **TemporadaHuerta:** Ciclo anual de producción (ej. "2024").
4.  **Cosecha:** Periodo específico de extracción de fruta dentro de una temporada.

#### 3.2.2 Ciclo de Vida de Cosecha
*   **Estado ABIERTA:** Se permite agregar Inversiones y Ventas.
*   **Estado CERRADA:** Se congelan los registros. Se calcula la Utilidad Neta.
*   **Regla de Integridad:** No se puede borrar una Cosecha si tiene Inversiones o Ventas asociadas. Se debe archivar.

#### 3.2.3 Finanzas de Campo
*   **Inversiones:** Gastos tipificados (`CategoriaInversion`). Ej. "Fertilizante", "Nómina".
*   **Ventas:** Ingresos por venta de fruta. Ej. "Venta a Empacadora Externa", "Venta a Bodega Propia".

### 3.3 Gestión de Bodega (Empaque y Transformación)

#### 3.3.1 Concepto de "Semana" (`CierreSemanal`)
La bodega opera bajo un régimen temporal estricto de Semanas.
*   **Continuidad:** S2 sigue a S1. S3 a S2. Sin huecos.
*   **Estado:**
    *   `ABIERTA`: Permite operaciones (recepción, empaque).
    *   `CERRADA`: Inmutable. Genera snapshot de inventario inicial para la siguiente semana.
*   **Auto-Cierre Logic (`ensure_week_state`):** Si el sistema detecta que la fecha actual supera el límite de una semana abierta, fuerza restricciones hasta que el administrador ejecute el cierre formal.

#### 3.3.2 Recepción (`Recepcion`)
Ingreso de materia prima.
*   **Validación Temporal:** La fecha de recepción DEBE caer dentro de la semana activa actual de la bodega. No se aceptan recepciones retroactivas en semanas cerradas.
*   **Datos:** Huertas (origen), Kilos Brutos, Tara, Kilos Netos.

#### 3.3.3 Empaque (`ClasificacionEmpaque`)
Proceso de transformación.
*   **Catálogos Normalizados:**
    *   `Material`: MADERA, PLASTICO.
    *   `Calidad`: PRIMERA (incluye "Segunda/Extra" en plástico), TERCERA, NIÑO, MADURO, MERMA.
    *   **Normalización:** El sistema convierte cualquier sinónimo a estos códigos canónicos.

#### 3.3.4 Inventarios
*   **Inventario Producto Terminado:** Se incrementa con Empaque, se reduce con Pedidos/Salidas.
*   **Inventario Consumibles (Teórico):** Cajas vacías. Se reduce automáticamente al empacar.

---

## 4. Diccionario de Datos Detallado (Data Dictionary)

Esta sección desglosa la estructura de la base de datos para referencia técnica y de negocio.

### 4.1 Módulo Usuarios (`gestion_usuarios`)

#### 4.1.1 Tabla: `users_users`
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | PK, Auto | Identificador interno. |
| `nombre` | Varchar(255) | Not Null | Nombre(s) del usuario. |
| `apellido` | Varchar(255) | Not Null | Apellidos. |
| `telefono` | Varchar(10) | Unique, Not Null | **Login**. Celular 10 dígitos. |
| `role` | Varchar(20) | Choices | `admin` o `usuario`. |
| `is_active` | Bool | Default True | Falso impide login. Parte del Soft Delete. |
| `archivado_en` | DateTime | Nullable | Fecha de baja lógica. |
| `password` | Varchar(128) | Not Null | Hash PBKDF2. |
| `last_login` | DateTime | Nullable | Último acceso exitoso. |

#### 4.1.2 Tabla: `users_registroactividad`
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | PK, Auto | ID. |
| `usuario_id` | FK(Users) | Cascade | Quién realizó la acción. |
| `accion` | Varchar(255) | Not Null | Verbo (CREAR_HUERTA, LOGIN, etc). |
| `detalles` | LongText | Nullable | JSON dump o descripción. |
| `ip` | GenericIP | Nullable | Dirección IP origen. |
| `fecha_hora` | DateTime | AutoNowAdd | Timestamp exacto. |

### 4.2 Módulo Huerta (`gestion_huerta`)

#### 4.2.1 Tabla: `gestion_huerta_propietario`
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | PK, Auto | ID. |
| `nombre` | Varchar(100) | Not Null | Nombre. |
| `apellidos` | Varchar(100) | Not Null | Apellidos. |
| `telefono` | Varchar(15) | Not Null | Contacto. |
| `is_active` | Bool | Default True | Soft Delete. |

#### 4.2.2 Tabla: `gestion_huerta_huerta`
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | PK, Auto | ID. |
| `nombre` | Varchar(100) | Not Null | Nombre de la parcela. |
| `ubicacion` | Varchar(255) | Not Null | Referencia geográfica. |
| `propietario_id` | FK(Propietario) | Cascade | Dueño. |
| `variedades` | Varchar(255) | Nullable | Ej. "Ataulfo, Kent". |
| `is_active` | Bool | Default True | Soft Delete. |

#### 4.2.3 Tabla: `gestion_huerta_cosecha`
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | PK, Auto | ID. |
| `nombre` | Varchar(100) | Not Null | Identificador (ej. "Corte Mayo"). |
| `temporada_id` | FK(Temporada) | Cascade | Temporada padre. |
| `huerta_id` | FK(Huerta) | Cascade | Huerta padre. |
| `estado` | Varchar(20) | Choices | `ABIERTA`, `CERRADA`. |
| `total_inversion`| Decimal(14,2)| Default 0 | Cache de total de gastos. |
| `total_venta` | Decimal(14,2)| Default 0 | Cache de total de ingresos. |

### 4.3 Módulo Bodega (`gestion_bodega`)

#### 4.3.1 Tabla: `gestion_bodega_bodega`
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | PK, Auto | ID. |
| `nombre` | Varchar(120) | Unique | Nombre de la planta. |
| `ubicacion` | Varchar(255) | Nullable | Dirección física. |

#### 4.3.2 Tabla: `gestion_bodega_cierresemanal`
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | PK, Auto | ID. |
| `bodega_id` | FK(Bodega) | Cascade | Bodega contexto. |
| `temporada_id` | FK(TemporadaBodega)| Cascade | Temporada contexto. |
| `fecha_inicio` | Date | Not Null | Inicio Lunes 00:00. |
| `fecha_fin` | Date | Not Null | Fin Domingo 23:59. |
| `cerrada` | Bool | Default False | True = Inmutable. |
| `saldo_anterior`| Decimal | Default 0 | Arrastre de caja/inv. |

#### 4.3.3 Tabla: `gestion_bodega_recepcion`
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | PK, Auto | ID. |
| `bodega_id` | FK(Bodega) | Cascade | Bodega receptora. |
| `huerta_origen_id`| FK(Huerta) | Nullable | Origen interno. |
| `kilos_brutos` | Decimal | Not Null | Peso báscula entrada. |
| `tara` | Decimal | Not Null | Peso camión/cajas. |
| `kilos_netos` | Decimal | Not Null | Brutos - Tara. |
| `fecha_hora` | DateTime | Not Null | Momento de recepción. |
| `semana_id` | FK(CierreSemanal)| Nullable | Vinculación temporal auto. |

#### 4.3.4 Tabla: `gestion_bodega_clasificacionempaque`
| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | BigInt | PK, Auto | ID. |
| `recepcion_id` | FK(Recepcion) | Nullable | Trazabilidad opcional a recepción específica. |
| `kilos` | Decimal | Not Null | Kilos procesados. |
| `cajas` | Int | Not Null | Cantidad de bultos. |
| `material` | Varchar | Choices | MADERA, PLASTICO. |
| `calidad` | Varchar | Choices | PRIMERA, TERCERA, etc. |

---

## 5. Operación del Sistema (Manual de Procedimientos)

Este manual describe los pasos exactos que deben seguir los usuarios para operar Risol 2.0.

### 5.1 Procedimientos de Inicio

#### 5.1.1 Alta de Usuario Nuevo (Admin)
1.  Ingresar al módulo **Usuarios**.
2.  Clic en botón **"Nuevo Usuario"**.
3.  Llenar formulario:
    *   Nombre y Apellidos.
    *   Teléfono (Será su login).
    *   Rol (Admin o Usuario).
    *   Contraseña temporal.
4.  Confirmar. El usuario ya puede ingresar.

#### 5.1.2 Configuración de Temporada (Admin)
1.  Ingresar a **Gestión Huerta** -> **Temporadas**.
2.  Verificar si existe la temporada del año en curso (ej. "2025"). Si no, crearla.
3.  Ingresar a **Gestión Bodega** -> **Temporadas**.
4.  Crear "Temporada de Empaque 2025" vinculada a la Bodega Principal.

### 5.2 Procedimientos de Campo

#### 5.2.1 Registro de Nueva Huerta
1.  Verificar que el **Propietario** exista. Si no, crearlo en pestaña "Propietarios".
2.  Ir a pestaña **Huertas**.
3.  Clic en **"Nueva Huerta"**.
4.  Seleccionar Propietario.
5.  Ingresar Nombre (ej. "El Zorrillo"), Ubicación y Variedades.
6.  Guardar.

#### 5.2.2 Inicio de Cosecha (Corte)
1.  Seleccionar la Huerta deseada.
2.  Ir a pestaña **Cosechas**.
3.  Clic en **"Nueva Cosecha"**.
4.  Nombre sugerido: "Corte [Mes] [Semana]".
5.  Estado inicial: **Abierta**.

#### 5.2.3 Registro de Gastos (Inversiones)
1.  Dentro de la Cosecha activa, ir a pestaña **Inversiones**.
2.  Clic en **"Nueva Inversión"**.
3.  Seleccionar Categoría (ej. "Nómina Cortadores").
4.  Monto ($).
5.  Fecha (Por defecto hoy).
6.  Nota opcional (ej. "Cuadrilla de Don Pedro").
7.  Guardar. El "Total Invertido" se actualiza arriba.

### 5.3 Procedimientos de Bodega

#### 5.3.1 Recepción de Camión
*Pre-requisito: La semana actual debe estar ABIERTA.*
1.  El camión sube a báscula.
2.  Operador ingresa a **Gestión Bodega** -> **Recepciones**.
3.  Clic **"Nueva Recepción"**.
4.  Seleccionar Huerta de Origen (Auto-complete).
5.  Ingresar **Peso Bruto** (ej. 8,500 kg).
6.  El camión descarga.
7.  El camión vacío sube a báscula (destare).
8.  Ingresar **Tara** (ej. 3,500 kg).
9.  Sistema calcula **Neto** (5,000 kg).
10. Guardar. Se imprime ticket (si hay impresora configurada).

#### 5.3.2 Registro de Empaque (Producción)
1.  Al finalizar turno o lote, contar las tarimas producidas.
2.  Ingresar a **Gestión Bodega** -> **Empaque**.
3.  Clic **"Agregar Empaque"**.
4.  Seleccionar Tipo (Madera/Plástico).
5.  Seleccionar Calidad (Primera/Tercera/Niño/etc).
6.  Ingresar Cantidad de Cajas.
7.  El sistema estima los Kilos según el promedio configurado (ej. 28kg madera, 25kg plástico), pero permite ajuste manual si se pesó.
8.  Guardar.

#### 5.3.3 Registro de Merma
1.  La fruta de desecho se pesa.
2.  Ingresar a **Empaque**.
3.  Seleccionar Calidad **MERMA** o **MADURO**.
4.  Ingresar Kilos directos (Cajas = 0 o equivalente referencial).
5.  Guardar. Esto es vital para cuadrar el balance de masa.

#### 5.3.4 Cierre de Semana (Crítico)
*Responsable: Gerente de Bodega / Admin.*
1.  Es Domingo por la noche o Lunes temprano.
2.  Ir al **Tablero Principal**.
3.  Revisar KPI: "Kilos Recibidos" vs "Kilos Empacados + Merma".
    *   Diferencia aceptable: 2-5% (deshidratación).
    *   Diferencia >5%: Alerta, falta registrar algo.
4.  Si todo cuadra, clic en botón **"Cerrar Semana"**.
5.  Confirmar advertencia "Esta acción es irreversible".
6.  Sistema genera reporte PDF de la semana.
7.  Sistema abre automáticamente la Semana S+1.

### 5.4 Procedimientos Administrativos

#### 5.4.1 Auditoría de Cambios
1.  Admin sospecha de un cambio de nombre en una huerta.
2.  Ingresar a **Usuarios** -> **Actividad**.
3.  Filtrar por Entidad: "Huerta".
4.  Ver lista cronológica: "Usuario X cambió nombre de 'La Escondida' a 'El Escondite' el día Y".

---

## 6. Glosario de Términos

*   **Soft Delete:** Borrado lógico. El dato permanece en BD pero oculto al usuario (`is_active=False`).
*   **Cascada:** Acción que afecta a los hijos. (Archivar Huerta -> Archiva Temporadas).
*   **Tara:** Peso del contenedor (camión, caja). Peso Bruto - Tara = Peso Neto.
*   **Merma:** Fruta no apta para comercialización estándar. Se registra para balance de masa.
*   **Canon:** Conjunto de reglas estrictas e inmutables que rigen el sistema Risol.
*   **Thunk:** (Término técnico) Función de Redux para realizar operaciones asíncronas (API calls).
*   **Endpoint:** URL del servidor donde se envía o recibe información (ej. `/api/huertas/`).
*   **Hard Closure:** Cierre de semana irreversible. Bloquea edición.

---

## 7. Anexos Tecnicos

### 7.1 Matriz de Roles y Permisos (Simplificada)

| Módulo | Acción | Admin | Usuario |
| :--- | :--- | :---: | :---: |
| **Usuarios** | Crear/Editar | ✅ | ❌ |
| **Usuarios** | Ver Lista | ✅ | ❌ |
| **Huertas** | Crear/Editar | ✅ | ✅ |
| **Huertas** | Archivar | ✅ | ⚠️ (Dueño) |
| **Cosechas** | Crear/Cerrar | ✅ | ✅ |
| **Inversiones**| Crear/Editar | ✅ | ✅ |
| **Bodega** | Recepción | ✅ | ✅ |
| **Bodega** | Cerrar Semana| ✅ | ❌ |
| **Auditoría** | Ver Logs | ✅ | ❌ |

### 7.2 Códigos de Calidad Canónicos
Para integraciones o reportes SQL directos, usar estos strings exactos (Case Sensitive en algunos contextos, normalizados en Model):
*   `MADERA_EXTRA` -> "EXTRA"
*   `MADERA_PRIMERA` -> "PRIMERA"
*   `MADERA_SEGUNDA` -> "SEGUNDA"
*   `PLASTICO_PRIMERA` -> "PRIMERA"
*   `PLASTICO_TERCERA` -> "TERCERA"
*   `NINIO` -> "NINIO" (Nótese sin Ñ para compatibilidad)
*   `MADURO` -> "MADURO"
*   `RONIA` -> "RONIA"
*   `MERMA` -> "MERMA"

---
**Fin del Documento Maestro.**
Propiedad de Agroproductores Risol. Prohibida su distribución no autorizada.
