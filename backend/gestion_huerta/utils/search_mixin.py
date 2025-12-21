# gestion_huerta/utils/search_mixin.py
"""
Mixin para centralizar la lógica de búsqueda "exact match first",
que prioriza resultados con coincidencia exacta de nombre.
"""
from typing import TypeVar, Tuple, Optional
from django.db.models import QuerySet

T = TypeVar('T')


class ExactMatchFirstMixin:
    """
    Mixin que implementa la lógica de "exact match first" para búsquedas.
    
    Uso:
        class MyViewSet(ExactMatchFirstMixin, viewsets.ModelViewSet):
            exact_match_field = 'nombre'  # campo para match exacto
            
            def list(self, request, *args, **kwargs):
                search_term = request.query_params.get('search', '').strip()
                queryset = self.get_queryset()
                exact_match, queryset = self.extract_exact_match(queryset, search_term)
                
                # ... paginar queryset ...
                
                results = self.prepend_exact_match(serializer.data, exact_match)
    """
    exact_match_field: str = 'nombre'
    
    def extract_exact_match(
        self, 
        queryset: QuerySet[T], 
        search_term: str,
        additional_filters: dict = None
    ) -> Tuple[Optional[T], QuerySet[T]]:
        """
        Extrae el registro con coincidencia exacta del queryset.
        
        Args:
            queryset: QuerySet base
            search_term: Término de búsqueda
            additional_filters: Filtros adicionales opcionales (ej: {'huertas__isnull': False})
            
        Returns:
            Tuple de (registro_exacto, queryset_sin_exacto)
        """
        if not search_term:
            return None, queryset
        
        filter_kwargs = {self.exact_match_field: search_term}
        if additional_filters:
            filter_kwargs.update(additional_filters)
        
        exact = queryset.filter(**filter_kwargs).first()
        if exact:
            return exact, queryset.exclude(id=exact.id)
        return None, queryset
    
    def prepend_exact_match(self, results: list, exact_match, serializer=None) -> list:
        """
        Antepone el registro exacto al inicio de los resultados.
        
        Args:
            results: Lista de datos serializados
            exact_match: Registro con match exacto (o None)
            serializer: Serializer para convertir exact_match (opcional)
            
        Returns:
            Lista con exact_match al inicio si existe
        """
        if not exact_match:
            return results
        
        if serializer:
            exact_data = serializer(exact_match).data
        else:
            # Asume que hay un get_serializer disponible
            exact_data = self.get_serializer(exact_match).data
        
        return [exact_data] + list(results)
