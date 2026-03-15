from rest_framework.pagination import PageNumberPagination

from agroproductores_risol.utils.notification_handler import NotificationHandler


class GenericPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100

    # Key por defecto para respuestas de list/paginación
    default_message_key = "data_processed_success"

    def get_paginated_response(self, results):
        """
        Contrato canónico único (Camino B):
        - success
        - notification (resuelta por NOTIFICATION_MESSAGES vía NotificationHandler)
        - data: { results, meta }
        """
        meta = {
            "count": self.page.paginator.count,
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "page": getattr(self.page, "number", None),
            "page_size": self.get_page_size(self.request),
            "total_pages": getattr(self.page.paginator, "num_pages", None),
        }

        message_key = getattr(self, "message_key", self.default_message_key)

        return NotificationHandler.generate_response(
            message_key=message_key,
            data={
                "results": results,
                "meta": meta,
            },
        )
