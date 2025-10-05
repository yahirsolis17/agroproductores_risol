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
    # Bodegas (coinciden con las keys usadas en tus vistas)
    # ==========================
    "bodega_create_success": {
        "message": "Bodega creada con éxito.",
        "type": "success",
        "code": 201,
    },
    "bodega_update_success": {
        "message": "Bodega actualizada con éxito.",
        "type": "success",
        "code": 200,
    },
    "bodega_archivada": {
        "message": "Bodega archivada correctamente.",
        "type": "success",
        "code": 200,
    },
    "bodega_restaurada": {
        "message": "Bodega restaurada correctamente.",
        "type": "success",
        "code": 200,
    },
    "ya_archivada": {
        "message": "La bodega ya está archivada.",
        "type": "warning",
        "code": 400,
    },
    "ya_esta_activa": {
        "message": "La bodega ya está activa.",
        "type": "warning",
        "code": 400,
    },
    "bodega_delete_success": {
        "message": "Bodega eliminada definitivamente.",
        "type": "success",
        "code": 200,
    },
    "bodega_debe_estar_archivada": {
        "message": "Debes archivar la bodega antes de eliminarla.",
        "type": "error",
        "code": 400,
    },
    "bodega_con_dependencias": {
        "message": "No se puede eliminar la bodega porque tiene temporadas asociadas.",
        "type": "error",
        "code": 400,
    },

    # ==========================
    # Clientes
    # ==========================
    "cliente_archivado": {
        "message": "Cliente archivado correctamente.",
        "type": "success",
        "code": 200,
    },
    "cliente_restaurado": {
        "message": "Cliente restaurado correctamente.",
        "type": "success",
        "code": 200,
    },

    # ==========================
    # Recepciones (mango crudo)
    # ==========================
    "recepcion_create_success": {
        "message": "Recepción registrada.",
        "type": "success",
        "code": 201,
    },
    "recepcion_update_success": {
        "message": "Recepción actualizada.",
        "type": "success",
        "code": 200,
    },
    "recepcion_delete_success": {
        "message": "Recepción eliminada.",
        "type": "success",
        "code": 200,
    },

    # ==========================
    # Clasificación / Empaque
    # ==========================
    "clasificacion_add_success": {
        "message": "Clasificación registrada.",
        "type": "success",
        "code": 201,
    },
    "clasificacion_update_success": {
        "message": "Clasificación actualizada.",
        "type": "success",
        "code": 200,
    },
    "clasificacion_delete_success": {
        "message": "Clasificación eliminada.",
        "type": "success",
        "code": 200,
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
        "code": 200,
    },
    "inv_plastico_mov_list_ok": {
        "message": "Historial de movimientos consultado.",
        "type": "success",
        "code": 200,
    },

    # ==========================
    # Compras de Madera y Abonos ($)
    # ==========================
    "compra_madera_create_success": {
        "message": "Compra de madera registrada.",
        "type": "success",
        "code": 201,
    },
    "abono_madera_success": {
        "message": "Abono registrado.",
        "type": "success",
        "code": 200,
    },

    # ==========================
    # Pedidos / Surtidos
    # ==========================
    "pedido_create_success": {
        "message": "Pedido creado.",
        "type": "success",
        "code": 201,
    },
    "pedido_update_success": {
        "message": "Pedido actualizado.",
        "type": "success",
        "code": 200,
    },
    "pedido_cancel_success": {
        "message": "Pedido cancelado.",
        "type": "success",
        "code": 200,
    },
    "pedido_surtir_success": {
        "message": "Pedido surtido.",
        "type": "success",
        "code": 200,
    },

    # ==========================
    # Camiones de salida
    # ==========================
    "camion_create_success": {
        "message": "Camión creado.",
        "type": "success",
        "code": 201,
    },
    "camion_confirm_success": {
        "message": "Camión confirmado y numerado.",
        "type": "success",
        "code": 200,
    },
    "camion_anulado": {
        "message": "Camión anulado.",
        "type": "success",
        "code": 200,
    },

    # ==========================
    # Temporadas de bodega (usa estas keys en tu ViewSet)
    # ==========================
    "temporada_bodega_archivada": {
        "message": "Temporada archivada.",
        "type": "success",
        "code": 200,
    },
    "temporada_bodega_restaurada": {
        "message": "Temporada restaurada.",
        "type": "success",
        "code": 200,
    },
    "temporada_bodega_finalizada": {
        "message": "Temporada finalizada.",
        "type": "success",
        "code": 200,
    },
    "temporada_bodega_reactivada": {
        "message": "Temporada reactivada.",
        "type": "success",
        "code": 200,
    },

    "temporada_ya_archivada": {
        "message": "Esta temporada ya se encuentra archivada.",
        "type": "warning",
        "code": 400,
    },
    "temporada_archivada_no_finalizar": {
        "message": "No puedes finalizar o reactivar una temporada archivada.",
        "type": "error",
        "code": 400,
    },

    # ==========================
    # Cierres
    # ==========================
    "cierre_semanal_success": {
        "message": "Cierre semanal generado y bloqueado.",
        "type": "success",
        "code": 200,
    },
    "cierre_temporada_success": {
        "message": "Cierre de temporada generado.",
        "type": "success",
        "code": 200,
    },
}
