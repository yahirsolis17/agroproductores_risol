from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class GenericPagination(PageNumberPagination):
    page_size_query_param = 'page_size'

    def get_paginated_response(self, data):
        return Response({
            'meta': {
                'count': self.page.paginator.count,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
            },
            'results': data
        })
