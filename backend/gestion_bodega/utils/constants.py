# backend/gestion_bodega/utils/constants.py
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
    "fetch_success": {
        "message": "Datos obtenidos correctamente.",
        "type": "success",
        "code": 200,
    },
    "fetch_success": {
        "message": "Datos obtenidos correctamente.",
        "type": "success",
        "code": 200,
    },
    "silent_response": {
        "message": "",
        "type": "info",
        "code": 200,
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
    "registro_archivado_no_editable": {
        "message": "El registro archivado no se puede editar.",
        "type": "error",
        "code": 400,
    },
    # alias usado puntualmente en recepciones.update
    "registro_archivado_no_editar": {
        "message": "El registro archivado no se puede editar.",
        "type": "error",
        "code": 400,
    },
    "bodega_archivada_no_permite_temporadas": {
        "message": "La bodega está archivada; no se pueden crear ni editar temporadas.",
        "type": "error",
        "code": 400,
    },
    "violacion_unicidad_año": {
        "message": "Ya existe una temporada registrada para ese año en esta bodega.",
        "type": "error",
        "code": 400,
    },
    "dependencias_presentes": {
        "message": "No se puede completar la operación: existen dependencias activas.",
        "type": "error",
        "code": 409,
    },
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
    "cliente_ya_archivado": {
        "message": "El cliente ya está archivado.",
        "type": "warning",
        "code": 400,
    },
    "cliente_ya_activo": {
        "message": "El cliente ya está activo.",
        "type": "warning",
        "code": 400,
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
    "recepcion_creada": {
        "message": "Recepción registrada.",
        "type": "success",
        "code": 201,
    },
    "recepcion_actualizada": {
        "message": "Recepción actualizada.",
        "type": "success",
        "code": 200,
    },
    "recepcion_archivada": {
        "message": "Recepción archivada.",
        "type": "success",
        "code": 200,
    },
    "recepcion_semana_invalida": {
        "message": "Revisa la semana y la fecha de la recepción.",
        "type": "error",
        "code": 400,
    },
    "recepcion_restaurada": {
        "message": "Recepción restaurada.",
        "type": "success",
        "code": 200,
    },
    "recepcion_semana_cerrada": {
        "message": "La semana correspondiente está cerrada; no se permiten cambios.",
        "type": "error",
        "code": 409,
    },
    "recepcion_temporada_invalida": {
        "message": "La temporada debe estar activa y no finalizada.",
        "type": "error",
        "code": 400,
    },
    "recepcion_ya_archivada": {
        "message": "La recepción ya está archivada.",
        "type": "warning",
        "code": 400,
    },
    "recepcion_ya_activa": {
        "message": "La recepción ya está activa.",
        "type": "warning",
        "code": 400,
    },
    "recepcion_debe_estar_archivada": {
        "message": "Debes archivar la recepción antes de eliminarla.",
        "type": "error",
        "code": 400,
    },
    "recepcion_con_dependencias": {
        "message": "No se puede eliminar: existen clasificaciones asociadas.",
        "type": "error",
        "code": 400,
    },
    "recepcion_bodega_temporada_incongruente": {
        "message": "La bodega de la recepción debe coincidir con la bodega de la temporada.",
        "type": "error",
        "code": 400,
    },
    "recepcion_cantidad_invalida": {
        "message": "La cantidad de cajas es inválida.",
        "type": "error",
        "code": 400,
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

    "clasificacion_creada": {
        "message": "Clasificación registrada.",
        "type": "success",
        "code": 201,
    },
    "clasificacion_actualizada": {
        "message": "Clasificación actualizada.",
        "type": "success",
        "code": 200,
    },
    "clasificacion_archivada": {
        "message": "Clasificación archivada.",
        "type": "success",
        "code": 200,
    },
    "clasificacion_con_consumos_inmutable": {
        "message": "No se puede modificar: la clasificación ya tiene consumos asociados.",
        "type": "error",
        "code": 409,
    },
    "clasificacion_semana_cerrada": {
        "message": "La semana correspondiente está cerrada; no se permiten cambios.",
        "type": "error",
        "code": 409,
    },
    "clasificacion_bulk_upsert_ok": {
        "message": "Clasificaciones registradas.",
        "type": "success",
        "code": 201,
    },
    "clasificacion_excede_capacidad": {
        "message": "La suma de clasificaciones excede las cajas disponibles.",
        "type": "error",
        "code": 400,
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

    "inventario_creado": {
        "message": "Inventario registrado.",
        "type": "success",
        "code": 201,
    },
    "inventario_ajustado": {
        "message": "Inventario ajustado.",
        "type": "success",
        "code": 200,
    },
    "inventario_semana_cerrada": {
        "message": "La semana correspondiente está cerrada; no se permiten cambios.",
        "type": "error",
        "code": 409,
    },
    "inventario_no_negativo": {
        "message": "El ajuste no puede dejar el inventario en negativo.",
        "type": "error",
        "code": 400,
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

    "compra_creada": {
        "message": "Compra de madera registrada.",
        "type": "success",
        "code": 201,
    },
    "compra_actualizada": {
        "message": "Compra de madera actualizada.",
        "type": "success",
        "code": 200,
    },
    "compra_archivada": {
        "message": "Compra de madera archivada.",
        "type": "success",
        "code": 200,
    },
    "compra_abonada": {
        "message": "Abono registrado.",
        "type": "success",
        "code": 200,
    },
    "compra_temporada_finalizada": {
        "message": "No se puede registrar porque la temporada está finalizada.",
        "type": "error",
        "code": 400,
    },

    # ==========================
    # Consumibles
    # ==========================
    "consumible_creado": {
        "message": "Gasto registrado.",
        "type": "success",
        "code": 201,
    },
    "consumible_actualizado": {
        "message": "Gasto actualizado.",
        "type": "success",
        "code": 200,
    },
    "consumible_archivado": {
        "message": "Gasto archivado.",
        "type": "success",
        "code": 200,
    },
    "consumible_semana_cerrada": {
        "message": "La semana correspondiente está cerrada; no se permiten cambios.",
        "type": "error",
        "code": 409,
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

    "pedido_creado": {
        "message": "Pedido creado.",
        "type": "success",
        "code": 201,
    },
    "pedido_actualizado": {
        "message": "Pedido actualizado.",
        "type": "success",
        "code": 200,
    },
    "pedido_archivado": {
        "message": "Pedido archivado.",
        "type": "success",
        "code": 200,
    },
    "pedido_cancelado": {
        "message": "Pedido cancelado.",
        "type": "success",
        "code": 200,
    },
    "pedido_semana_cerrada": {
        "message": "La semana correspondiente está cerrada; no se permiten cambios.",
        "type": "error",
        "code": 409,
    },
    "pedido_no_cancelable_con_surtidos": {
        "message": "No se puede cancelar un pedido con surtidos registrados.",
        "type": "error",
        "code": 409,
    },
    "pedido_surtido_ok": {
        "message": "Pedido surtido.",
        "type": "success",
        "code": 200,
    },
    "surtido_origen_semana_cerrada": {
        "message": "Alguna clasificación origen pertenece a una semana cerrada.",
        "type": "error",
        "code": 409,
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

    "camion_creado": {
        "message": "Camión creado.",
        "type": "success",
        "code": 201,
    },
    "camion_actualizado": {
        "message": "Camión actualizado.",
        "type": "success",
        "code": 200,
    },
    "camion_archivado": {
        "message": "Camión archivado.",
        "type": "success",
        "code": 200,
    },
    "camion_confirmado": {
        "message": "Camión confirmado.",
        "type": "success",
        "code": 200,
    },
    "camion_semana_cerrada": {
        "message": "La semana correspondiente está cerrada; no se permiten cambios.",
        "type": "error",
        "code": 409,
    },
    "camion_no_confirmable": {
        "message": "El camión no se puede confirmar en su estado actual.",
        "type": "error",
        "code": 400,
    },
    "camion_item_creado": {
        "message": "Ítem agregado al camión.",
        "type": "success",
        "code": 201,
    },
    "camion_item_archivado": {
        "message": "Ítem de camión archivado.",
        "type": "success",
        "code": 200,
    },
    "camion_item_no_encontrado": {
        "message": "Ítem de camión no encontrado.",
        "type": "error",
        "code": 404,
    },

    # ==========================
    # Temporadas de bodega
    # ==========================
    "temporadabodega_creada": {
        "message": "Temporada creada correctamente.",
        "type": "success",
        "code": 201,
    },
    "temporadabodega_archivada": {
        "message": "Temporada archivada.",
        "type": "success",
        "code": 200,
    },
    "temporadabodega_actualizada": {
        "message": "Temporada actualizada correctamente.",
        "type": "success",
        "code": 200,
    },
    "temporadabodega_restaurada": {
        "message": "Temporada restaurada.",
        "type": "success",
        "code": 200,
    },
    "temporadabodega_eliminada": {
        "message": "Temporada eliminada definitivamente.",
        "type": "success",
        "code": 200,
    },
    "temporada_creada": {
        "message": "Temporada creada correctamente.",
        "type": "success",
        "code": 201,
    },
    "temporada_archivada": {
        "message": "Temporada archivada.",
        "type": "success",
        "code": 200,
    },
    "temporada_restaurada": {
        "message": "Temporada restaurada.",
        "type": "success",
        "code": 200,
    },
    "temporada_finalizada": {
        "message": "Temporada finalizada.",
        "type": "success",
        "code": 200,
    },
    "temporada_reactivada": {
        "message": "Temporada reactivada.",
        "type": "success",
        "code": 200,
    },
    "temporada_eliminada": {
        "message": "Temporada eliminada definitivamente.",
        "type": "success",
        "code": 200,
    },
    "temporada_en_curso": {
        "message": "Ya existe una temporada en curso para este año.",
        "type": "warning",
        "code": 400,
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
    "temporada_no_archivada": {
        "message": "No se puede eliminar una temporada activa.",
        "type": "error",
        "code": 400,
    },
    "temporada_no_finalizada": {
        "message": "No se puede eliminar una temporada en curso.",
        "type": "error",
        "code": 400,
    },

    # Alias legacy (compatibilidad)
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
    "cierre_semanal_creado": {
        "message": "Cierre semanal generado y bloqueado.",
        "type": "success",
        "code": 200,
    },
    "temporada_cerrada": {
        "message": "Temporada cerrada correctamente.",
        "type": "success",
        "code": 200,
    },
    "cierre_semanal_ya_cerrado": {
        "message": "La semana ya se encuentra cerrada.",
        "type": "error",
        "code": 400,
    },
    "cierre_semanal_cerrado": {
        "message": "Semana cerrada correctamente.",
        "type": "success",
        "code": 200,
    },
    "cierre_fecha_invalida": {
        "message": "La fecha de cierre no es válida (debe ser posterior al inicio).",
        "type": "error",
        "code": 400,
    },
    "cierre_duracion_excedida": {
        "message": "La duración de la semana excede el límite permitido (7 días).",
        "type": "error",
        "code": 400,
    },
    "semana_no_encontrada": {
        "message": "No se encontró la semana indicada.",
        "type": "error",
        "code": 404,
    },

    # Extras de estado/alias frecuentes
    "temporada_ya_activa": {
        "message": "La temporada ya está activa.",
        "type": "warning",
        "code": 400,
    },
}
