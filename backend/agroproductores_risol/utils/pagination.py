from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class GenericPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        # Determinar el nombre del recurso basado en el contexto
        # Por defecto usamos 'results', pero podemos personalizar según el viewset
        resource_name = getattr(self, 'resource_name', 'results')
        
        return Response({
            'success': True,
            'notification': {
                'key': 'no_notification',
                'message': '',
                'type': 'info'
            },
            'data': {
                resource_name: data,
                'meta': {
                    'count': self.page.paginator.count,
                    'next': self.get_next_link(),
                    'previous': self.get_previous_link(),
                    'page': getattr(self.page, 'number', None),
                    'page_size': self.get_page_size(self.request),
                    'total_pages': getattr(self.page.paginator, 'num_pages', None),
                }
            }
        })

class TemporadaPagination(GenericPagination):
    resource_name = 'temporadas'

class HuertaPagination(GenericPagination):
    resource_name = 'huertas'

class UsuarioPagination(GenericPagination):
    resource_name = 'usuarios'
