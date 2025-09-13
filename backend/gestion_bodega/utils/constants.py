# Mensajes de notificación para el módulo de Bodega.
# Mismo contrato de NOTIFICATION_MESSAGES que en otros módulos.

NOTIFICATION_MESSAGES = {
    # ==========================
    # Genéricos
    # ==========================
    "validation_error": {
        "message": "Por favor corrige los campos marcados.",
        "type": "error",
        "code": 400,
    },
    "permission_denied": {
        "message": "No tienes permisos para realizar esta acción en bodega.",
        "type": "error",
        "code": 403,
    },
    "server_error": {
        "message": "Error interno del servidor.",
        "type": "error",
        "code": 500,
    },
    "not_found": {
        "message": "Recurso no encontrado.",
        "type": "error",
        "code": 404,
    },
    "data_processed_success": {
        "message": "Operación realizada con éxito.",
        "type": "success",
        "code": 200,
    },

    # ==========================
    # Bloqueos / Invariantes
    # ==========================
    "temporada_bodega_inactiva_o_finalizada": {
        "message": "No se permiten cambios: la temporada de bodega está archivada o finalizada.",
        "type": "error",
        "code": 409,
    },
    "semana_bloqueada": {
        "message": "Semana cerrada: no se permite editar movimientos dentro del rango de ese cierre.",
        "type": "error",
        "code": 409,
    },
    "overpicking": {
        "message": "Cantidad excede lo disponible (overpicking).",
        "type": "error",
        "code": 409,
    },

    # ==========================
    # Bodegas
    # ==========================
    "bodega_create_success": {
        "message": "Bodega creada con éxito.",
        "type": "success",
    },
    "bodega_update_success": {
        "message": "Bodega actualizada con éxito.",
        "type": "success",
    },
    "bodega_archivada": {
        "message": "Bodega archivada correctamente.",
        "type": "success",
    },
    "bodega_restaurada": {
        "message": "Bodega restaurada correctamente.",
        "type": "success",
    },

    # ==========================
    # Recepciones (mango crudo)
    # ==========================
    "recepcion_create_success": {
        "message": "Recepción registrada.",
        "type": "success",
    },
    "recepcion_update_success": {
        "message": "Recepción actualizada.",
        "type": "success",
    },
    "recepcion_delete_success": {
        "message": "Recepción eliminada.",
        "type": "success",
    },

    # ==========================
    # Clasificación / Empaque
    # ==========================
    "clasificacion_add_success": {
        "message": "Clasificación registrada.",
        "type": "success",
    },
    "clasificacion_update_success": {
        "message": "Clasificación actualizada.",
        "type": "success",
    },
    "clasificacion_delete_success": {
        "message": "Clasificación eliminada.",
        "type": "success",
    },
    "clasificacion_bloqueada_por_surtido": {
        "message": "No se puede modificar: ya se surtió de esta clasificación.",
        "type": "error",
        "code": 409
    },

    # ==========================
    # Inventario de Plástico
    # ==========================
    "inv_plastico_ajuste_success": {
        "message": "Ajuste de inventario aplicado.",
        "type": "success",
    },
    "inv_plastico_mov_list_ok": {
        "message": "Historial de movimientos consultado.",
        "type": "success",
    },

    # ==========================
    # Compras de Madera y Abonos ($)
    # ==========================
    "compra_madera_create_success": {
        "message": "Compra de madera registrada.",
        "type": "success",
    },
    "abono_madera_success": {
        "message": "Abono registrado.",
        "type": "success",
    },

    # ==========================
    # Pedidos / Surtidos
    # ==========================
    "pedido_create_success": {
        "message": "Pedido creado.",
        "type": "success",
    },
    "pedido_update_success": {
        "message": "Pedido actualizado.",
        "type": "success",
    },
    "pedido_cancel_success": {
        "message": "Pedido cancelado.",
        "type": "success",
    },
    "pedido_surtir_success": {
        "message": "Pedido surtido.",
        "type": "success",
    },

    # ==========================
    # Camiones de salida
    # ==========================
    "camion_create_success": {
        "message": "Camión creado.",
        "type": "success",
    },
    "camion_confirm_success": {
        "message": "Camión confirmado y numerado.",
        "type": "success",
    },
    "camion_anulado": {
        "message": "Camión anulado.",
        "type": "success",
    },

    # ==========================
    # Cierres
    # ==========================
    "cierre_semanal_success": {
        "message": "Cierre semanal generado y bloqueado.",
        "type": "success",
    },
    "cierre_temporada_success": {
        "message": "Cierre de temporada generado.",
        "type": "success",
    },
}
