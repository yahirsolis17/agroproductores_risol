# Guía de Desarrollo - Agroproductores Risol

## 📋 Información General

Esta guía está dirigida a desarrolladores que trabajarán en el sistema de gestión agrícola. Incluye estándares de código, arquitectura, patrones de desarrollo y mejores prácticas.

## 🏗️ Arquitectura del Sistema

### Patrón de Arquitectura
El sistema sigue una **arquitectura modular** con separación clara entre frontend y backend:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Components  │  │   Modules   │  │   Global (Store)    │  │
│  │   Common    │  │ gestion_*   │  │  API, Routes, Utils │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                         HTTP/REST API
                              │
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Django)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Models    │  │    Views    │  │    Serializers     │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    URLs     │  │ Permissions │  │      Utils          │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                         MySQL Database
```

### Principios de Diseño

1. **Separación de Responsabilidades**: Cada módulo tiene una responsabilidad específica
2. **DRY (Don't Repeat Yourself)**: Reutilización de código mediante componentes y utilidades
3. **SOLID**: Aplicación de principios SOLID en el diseño de clases
4. **API First**: El backend expone una API REST completa
5. **Modularidad**: Funcionalidades organizadas en módulos independientes

## 🔧 Configuración del Entorno de Desarrollo

### Prerrequisitos
- Python 3.8+
- Node.js 16+
- MySQL 8.0+
- Git
- VS Code (recomendado)

### Configuración Inicial

#### 1. Clonar y configurar el repositorio
```bash
git clone https://github.com/yahirsolis17/agroproductores_risol.git
cd agroproductores_risol
```

#### 2. Configurar Backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

#### 3. Configurar Frontend
```bash
cd frontend
npm install
```

#### 4. Variables de entorno
Crear `.env` en `backend/`:
```env
DEBUG=True
SECRET_KEY=tu-clave-de-desarrollo
DB_NAME=agroproductores_risol_dev
DB_USER=root
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=3306
```

#### 5. Base de datos
```sql
CREATE DATABASE agroproductores_risol_dev;
```

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### Extensiones Recomendadas para VS Code

#### Backend (Python/Django)
- Python
- Django
- Python Docstring Generator
- autoDocstring
- GitLens

#### Frontend (React/TypeScript)
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Auto Rename Tag
- Bracket Pair Colorizer
- Prettier - Code formatter
- ESLint

## 📝 Estándares de Código

### Backend (Python/Django)

#### Convenciones de Nomenclatura
```python
# Clases: PascalCase
class PropietarioHuerta:
    pass

# Funciones y variables: snake_case
def calcular_ganancia_neta():
    total_ventas = 0
    return total_ventas

# Constantes: UPPER_SNAKE_CASE
MAX_INTENTOS_LOGIN = 5
TIPOS_MANGO = ['Manila', 'Ataulfo', 'Tommy']

# Archivos: snake_case
# huerta_views.py, user_serializers.py
```

#### Estructura de Modelos
```python
class Huerta(models.Model):
    """
    Modelo para representar una huerta agrícola.
    
    Attributes:
        nombre (str): Nombre identificativo de la huerta
        ubicacion (str): Ubicación geográfica
        hectareas (float): Extensión en hectáreas
    """
    # Campos principales
    nombre = models.CharField(max_length=100)
    ubicacion = models.CharField(max_length=255)
    hectareas = models.FloatField(validators=[MinValueValidator(0.1)])
    
    # Relaciones
    propietario = models.ForeignKey(
        Propietario,
        on_delete=models.CASCADE,
        related_name="huertas"
    )
    
    # Campos de control
    is_active = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('nombre', 'ubicacion', 'propietario')
        ordering = ['nombre']
        indexes = [models.Index(fields=['nombre'])]
    
    def __str__(self):
        return f"{self.nombre} ({self.propietario})"
    
    def archivar(self):
        """Marca la huerta como archivada (soft delete)."""
        if self.is_active:
            self.is_active = False
            self.archivado_en = timezone.now()
            self.save(update_fields=['is_active', 'archivado_en'])
```

#### Estructura de Vistas (ViewSets)
```python
class HuertaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de huertas.
    
    Proporciona operaciones CRUD completas con filtros y búsqueda.
    """
    queryset = Huerta.objects.filter(is_active=True)
    serializer_class = HuertaSerializer
    permission_classes = [IsAuthenticated, HuertaPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['propietario', 'is_active']
    search_fields = ['nombre', 'ubicacion', 'variedades']
    ordering_fields = ['nombre', 'hectareas', 'id']
    ordering = ['nombre']
    
    def get_queryset(self):
        """Filtrar queryset según permisos del usuario."""
        queryset = super().get_queryset()
        if not self.request.user.is_admin:
            # Los usuarios normales solo ven sus huertas
            queryset = queryset.filter(propietario__usuario=self.request.user)
        return queryset
    
    @action(detail=True, methods=['post'])
    def archivar(self, request, pk=None):
        """Archivar huerta (soft delete)."""
        huerta = self.get_object()
        huerta.archivar()
        return Response({'status': 'Huerta archivada'})
    
    @action(detail=True, methods=['get'])
    def resumen(self, request, pk=None):
        """Obtener resumen financiero de la huerta."""
        huerta = self.get_object()
        # Lógica para calcular resumen
        return Response(resumen_data)
```

#### Estructura de Serializers
```python
class HuertaSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Huerta.
    
    Incluye validaciones personalizadas y campos calculados.
    """
    propietario_nombre = serializers.CharField(
        source='propietario.get_full_name', 
        read_only=True
    )
    total_temporadas = serializers.SerializerMethodField()
    
    class Meta:
        model = Huerta
        fields = [
            'id', 'nombre', 'ubicacion', 'variedades', 
            'hectareas', 'propietario', 'propietario_nombre',
            'total_temporadas', 'is_active', 'archivado_en'
        ]
        read_only_fields = ['archivado_en']
    
    def get_total_temporadas(self, obj):
        """Calcular total de temporadas activas."""
        return obj.temporadas.filter(is_active=True).count()
    
    def validate_hectareas(self, value):
        """Validar que las hectáreas sean positivas."""
        if value <= 0:
            raise serializers.ValidationError(
                "Las hectáreas deben ser mayor a 0"
            )
        return value
    
    def validate(self, attrs):
        """Validaciones a nivel de objeto."""
        # Validar unicidad por propietario
        if self.instance is None:  # Creación
            if Huerta.objects.filter(
                nombre=attrs['nombre'],
                propietario=attrs['propietario']
            ).exists():
                raise serializers.ValidationError(
                    "Ya existe una huerta con este nombre para este propietario"
                )
        return attrs
```

### Frontend (React/TypeScript)

#### Convenciones de Nomenclatura
```typescript
// Componentes: PascalCase
const HuertaCard: React.FC<HuertaCardProps> = ({ huerta }) => {
  return <div>{huerta.nombre}</div>;
};

// Hooks personalizados: camelCase con prefijo 'use'
const useHuertas = () => {
  const [huertas, setHuertas] = useState<Huerta[]>([]);
  return { huertas, setHuertas };
};

// Interfaces/Types: PascalCase
interface Huerta {
  id: number;
  nombre: string;
  ubicacion: string;
  hectareas: number;
}

// Constantes: UPPER_SNAKE_CASE
const API_ENDPOINTS = {
  HUERTAS: '/api/huertas/',
  USUARIOS: '/api/usuarios/',
} as const;

// Archivos: PascalCase para componentes, camelCase para utilidades
// HuertaCard.tsx, apiClient.ts
```

#### Estructura de Componentes
```typescript
// src/components/huerta/HuertaCard.tsx
import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';
import { Huerta } from '../../types/huerta';

interface HuertaCardProps {
  huerta: Huerta;
  onEdit?: (huerta: Huerta) => void;
  onDelete?: (id: number) => void;
  readonly?: boolean;
}

/**
 * Componente para mostrar información de una huerta en formato de tarjeta.
 * 
 * @param huerta - Datos de la huerta
 * @param onEdit - Callback para editar huerta
 * @param onDelete - Callback para eliminar huerta
 * @param readonly - Si es solo lectura
 */
const HuertaCard: React.FC<HuertaCardProps> = ({
  huerta,
  onEdit,
  onDelete,
  readonly = false
}) => {
  const handleEdit = () => {
    onEdit?.(huerta);
  };

  const handleDelete = () => {
    if (window.confirm('¿Está seguro de eliminar esta huerta?')) {
      onDelete?.(huerta.id);
    }
  };

  return (
    <Card sx={{ minWidth: 275, mb: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2">
          {huerta.nombre}
        </Typography>
        <Typography color="text.secondary">
          {huerta.ubicacion}
        </Typography>
        <Typography variant="body2">
          Hectáreas: {huerta.hectareas}
        </Typography>
        
        {!readonly && (
          <div style={{ marginTop: 16 }}>
            <Button 
              size="small" 
              onClick={handleEdit}
              sx={{ mr: 1 }}
            >
              Editar
            </Button>
            <Button 
              size="small" 
              color="error" 
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HuertaCard;
```

#### Estructura de Hooks Personalizados
```typescript
// src/hooks/useHuertas.ts
import { useState, useEffect } from 'react';
import { Huerta } from '../types/huerta';
import { huertaService } from '../services/huertaService';

interface UseHuertasReturn {
  huertas: Huerta[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createHuerta: (huerta: Omit<Huerta, 'id'>) => Promise<void>;
  updateHuerta: (id: number, huerta: Partial<Huerta>) => Promise<void>;
  deleteHuerta: (id: number) => Promise<void>;
}

/**
 * Hook personalizado para gestión de huertas.
 * Proporciona estado y operaciones CRUD.
 */
export const useHuertas = (): UseHuertasReturn => {
  const [huertas, setHuertas] = useState<Huerta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHuertas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await huertaService.getAll();
      setHuertas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const createHuerta = async (huerta: Omit<Huerta, 'id'>) => {
    try {
      const newHuerta = await huertaService.create(huerta);
      setHuertas(prev => [...prev, newHuerta]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear huerta');
      throw err;
    }
  };

  const updateHuerta = async (id: number, huerta: Partial<Huerta>) => {
    try {
      const updatedHuerta = await huertaService.update(id, huerta);
      setHuertas(prev => 
        prev.map(h => h.id === id ? updatedHuerta : h)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar huerta');
      throw err;
    }
  };

  const deleteHuerta = async (id: number) => {
    try {
      await huertaService.delete(id);
      setHuertas(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar huerta');
      throw err;
    }
  };

  useEffect(() => {
    fetchHuertas();
  }, []);

  return {
    huertas,
    loading,
    error,
    refetch: fetchHuertas,
    createHuerta,
    updateHuerta,
    deleteHuerta
  };
};
```

#### Estructura de Servicios
```typescript
// src/services/huertaService.ts
import { apiClient } from '../global/api/apiClient';
import { Huerta } from '../types/huerta';

export const huertaService = {
  async getAll(): Promise<Huerta[]> {
    const response = await apiClient.get('/huertas/');
    return response.data.results;
  },

  async getById(id: number): Promise<Huerta> {
    const response = await apiClient.get(`/huertas/${id}/`);
    return response.data;
  },

  async create(huerta: Omit<Huerta, 'id'>): Promise<Huerta> {
    const response = await apiClient.post('/huertas/', huerta);
    return response.data;
  },

  async update(id: number, huerta: Partial<Huerta>): Promise<Huerta> {
    const response = await apiClient.put(`/huertas/${id}/`, huerta);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/huertas/${id}/`);
  },

  async getResumen(id: number): Promise<any> {
    const response = await apiClient.get(`/huertas/${id}/resumen/`);
    return response.data;
  }
};
```

## 🧪 Testing

### Backend (Django)

#### Tests de Modelos
```python
# backend/gestion_huerta/tests/test_models.py
from django.test import TestCase
from django.core.exceptions import ValidationError
from gestion_huerta.models import Propietario, Huerta

class HuertaModelTest(TestCase):
    def setUp(self):
        self.propietario = Propietario.objects.create(
            nombre="Juan",
            apellidos="Pérez",
            telefono="1234567890",
            direccion="Calle 123"
        )

    def test_crear_huerta_valida(self):
        """Test crear huerta con datos válidos."""
        huerta = Huerta.objects.create(
            nombre="Huerta Test",
            ubicacion="Ubicación Test",
            variedades="Mango Manila",
            hectareas=2.5,
            propietario=self.propietario
        )
        self.assertEqual(huerta.nombre, "Huerta Test")
        self.assertTrue(huerta.is_active)

    def test_huerta_str_representation(self):
        """Test representación string del modelo."""
        huerta = Huerta.objects.create(
            nombre="Huerta Test",
            ubicacion="Ubicación Test",
            variedades="Mango Manila",
            hectareas=2.5,
            propietario=self.propietario
        )
        expected = f"Huerta Test ({self.propietario})"
        self.assertEqual(str(huerta), expected)

    def test_archivar_huerta(self):
        """Test soft delete de huerta."""
        huerta = Huerta.objects.create(
            nombre="Huerta Test",
            ubicacion="Ubicación Test",
            variedades="Mango Manila",
            hectareas=2.5,
            propietario=self.propietario
        )
        
        huerta.archivar()
        huerta.refresh_from_db()
        
        self.assertFalse(huerta.is_active)
        self.assertIsNotNone(huerta.archivado_en)
```

#### Tests de API
```python
# backend/gestion_huerta/tests/test_api.py
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from gestion_huerta.models import Propietario, Huerta

User = get_user_model()

class HuertaAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            telefono="1234567890",
            nombre="Test",
            apellido="User",
            password="testpass123"
        )
        self.propietario = Propietario.objects.create(
            nombre="Juan",
            apellidos="Pérez",
            telefono="0987654321",
            direccion="Calle 123"
        )
        self.client.force_authenticate(user=self.user)

    def test_listar_huertas(self):
        """Test listar huertas."""
        Huerta.objects.create(
            nombre="Huerta 1",
            ubicacion="Ubicación 1",
            variedades="Mango",
            hectareas=2.0,
            propietario=self.propietario
        )
        
        response = self.client.get('/huerta/huertas/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_crear_huerta(self):
        """Test crear nueva huerta."""
        data = {
            'nombre': 'Nueva Huerta',
            'ubicacion': 'Nueva Ubicación',
            'variedades': 'Mango Manila',
            'hectareas': 3.0,
            'propietario': self.propietario.id
        }
        
        response = self.client.post('/huerta/huertas/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Huerta.objects.count(), 1)

    def test_crear_huerta_datos_invalidos(self):
        """Test crear huerta con datos inválidos."""
        data = {
            'nombre': '',  # Nombre vacío
            'hectareas': -1,  # Hectáreas negativas
            'propietario': self.propietario.id
        }
        
        response = self.client.post('/huerta/huertas/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

### Frontend (React/TypeScript)

#### Tests de Componentes
```typescript
// src/components/huerta/__tests__/HuertaCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HuertaCard from '../HuertaCard';
import { Huerta } from '../../../types/huerta';

const mockHuerta: Huerta = {
  id: 1,
  nombre: 'Huerta Test',
  ubicacion: 'Ubicación Test',
  variedades: 'Mango Manila',
  hectareas: 2.5,
  propietario: 1,
  is_active: true
};

describe('HuertaCard', () => {
  test('renderiza información de la huerta', () => {
    render(<HuertaCard huerta={mockHuerta} />);
    
    expect(screen.getByText('Huerta Test')).toBeInTheDocument();
    expect(screen.getByText('Ubicación Test')).toBeInTheDocument();
    expect(screen.getByText('Hectáreas: 2.5')).toBeInTheDocument();
  });

  test('muestra botones de acción cuando no es readonly', () => {
    render(<HuertaCard huerta={mockHuerta} />);
    
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  test('oculta botones cuando es readonly', () => {
    render(<HuertaCard huerta={mockHuerta} readonly />);
    
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
  });

  test('llama onEdit cuando se hace clic en editar', () => {
    const mockOnEdit = jest.fn();
    render(<HuertaCard huerta={mockHuerta} onEdit={mockOnEdit} />);
    
    fireEvent.click(screen.getByText('Editar'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockHuerta);
  });

  test('muestra confirmación antes de eliminar', () => {
    const mockOnDelete = jest.fn();
    window.confirm = jest.fn(() => true);
    
    render(<HuertaCard huerta={mockHuerta} onDelete={mockOnDelete} />);
    
    fireEvent.click(screen.getByText('Eliminar'));
    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });
});
```

#### Tests de Hooks
```typescript
// src/hooks/__tests__/useHuertas.test.ts
import { renderHook, act } from '@testing-library/react';
import { useHuertas } from '../useHuertas';
import { huertaService } from '../../services/huertaService';

// Mock del servicio
jest.mock('../../services/huertaService');
const mockHuertaService = huertaService as jest.Mocked<typeof huertaService>;

describe('useHuertas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('carga huertas al inicializar', async () => {
    const mockHuertas = [
      { id: 1, nombre: 'Huerta 1', ubicacion: 'Ubicación 1', hectareas: 2.0 },
      { id: 2, nombre: 'Huerta 2', ubicacion: 'Ubicación 2', hectareas: 3.0 }
    ];
    
    mockHuertaService.getAll.mockResolvedValue(mockHuertas);
    
    const { result } = renderHook(() => useHuertas());
    
    expect(result.current.loading).toBe(true);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.huertas).toEqual(mockHuertas);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('maneja errores al cargar huertas', async () => {
    const errorMessage = 'Error al cargar huertas';
    mockHuertaService.getAll.mockRejectedValue(new Error(errorMessage));
    
    const { result } = renderHook(() => useHuertas());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.loading).toBe(false);
  });
});
```

## 🔄 Flujo de Trabajo Git

### Estructura de Ramas
```
main (producción)
├── develop (desarrollo)
│   ├── feature/nueva-funcionalidad
│   ├── feature/mejora-ui
│   └── bugfix/correccion-error
└── hotfix/error-critico
```

### Convenciones de Commits
```bash
# Formato: tipo(alcance): descripción

# Tipos:
feat: nueva funcionalidad
fix: corrección de error
docs: documentación
style: formato, punto y coma faltante, etc.
refactor: refactorización de código
test: agregar tests
chore: tareas de mantenimiento

# Ejemplos:
feat(huerta): agregar filtro por propietario
fix(auth): corregir validación de token
docs(api): actualizar documentación de endpoints
style(frontend): aplicar formato con prettier
refactor(models): optimizar consultas de base de datos
test(huerta): agregar tests para modelo Huerta
chore(deps): actualizar dependencias
```

### Proceso de Desarrollo
1. **Crear rama desde develop**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nueva-funcionalidad
   ```

2. **Desarrollar y hacer commits**
   ```bash
   git add .
   git commit -m "feat(huerta): agregar validación de hectáreas"
   ```

3. **Mantener rama actualizada**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout feature/nueva-funcionalidad
   git rebase develop
   ```

4. **Crear Pull Request**
   - Título descriptivo
   - Descripción detallada de cambios
   - Screenshots si aplica
   - Asignar reviewers

5. **Merge a develop**
   - Después de aprobación
   - Squash commits si es necesario
   - Eliminar rama feature

## 📋 Checklist de Desarrollo

### Antes de hacer commit
- [ ] Código formateado correctamente
- [ ] Tests pasando
- [ ] Sin console.log o prints de debug
- [ ] Documentación actualizada
- [ ] Variables de entorno configuradas
- [ ] Migraciones creadas (si aplica)

### Antes de Pull Request
- [ ] Rama actualizada con develop
- [ ] Tests unitarios agregados/actualizados
- [ ] Documentación de API actualizada
- [ ] Screenshots de cambios UI
- [ ] Descripción clara de cambios
- [ ] Sin conflictos de merge

### Antes de deploy
- [ ] Tests de integración pasando
- [ ] Variables de producción configuradas
- [ ] Migraciones probadas
- [ ] Backup de base de datos
- [ ] Plan de rollback definido

## 🛠️ Herramientas de Desarrollo

### Backend
- **Django Debug Toolbar**: Para debugging en desarrollo
- **Django Extensions**: Comandos adicionales útiles
- **Factory Boy**: Para crear datos de prueba
- **Coverage.py**: Para medir cobertura de tests

### Frontend
- **React Developer Tools**: Extensión de navegador
- **Redux DevTools**: Para debugging de estado
- **Storybook**: Para desarrollo de componentes aislados
- **Jest**: Framework de testing
- **React Testing Library**: Para tests de componentes

### Generales
- **Pre-commit hooks**: Para validaciones automáticas
- **GitHub Actions**: CI/CD
- **Docker**: Para containerización
- **Postman**: Para testing de API

## 📚 Recursos Adicionales

### Documentación Oficial
- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Material-UI](https://mui.com/)

### Guías de Estilo
- [PEP 8 - Python Style Guide](https://pep8.org/)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

### Herramientas Online
- [Django REST Framework Browsable API](http://localhost:8000/api/)
- [Swagger UI](http://localhost:8000/api/docs/swagger/)
- [TypeScript Playground](https://www.typescriptlang.org/play)

---

*Esta guía debe actualizarse conforme evolucione el proyecto y se adopten nuevas tecnologías o patrones.*
