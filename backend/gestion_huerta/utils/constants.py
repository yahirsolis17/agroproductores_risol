NOTIFICATION_MESSAGES = {
    # -------------------------------------------------
    # Mensajes genéricos / Errores
    # -------------------------------------------------
    "validation_error": {
        "message": "Por favor, corrige los errores en los campos back.",
        "type": "error"
    },
    "permission_denied": {
        "message": "No tienes permisos para realizar esta acción en el módulo de huertas. back",
        "type": "error",
        "code": 403
    },
    "server_error": {
        "message": "Ha ocurrido un error en el servidor al procesar la solicitud de huerta. back",
        "type": "error",
        "code": 500
    },
    "data_processed_success": {
        "message": "Operación realizada con éxito back.",
        "type": "success"
    },

    # -------------------------------------------------
    # Propietarios
    # -------------------------------------------------
    "propietario_create_success": {
        "message": "Propietario creado con éxito. back",
        "type": "success"
    },
    "propietario_update_success": {
        "message": "Propietario actualizado con éxito. back",
        "type": "success"
    },
    "propietario_delete_success": {
        "message": "Propietario eliminado correctamente. back",
        "type": "success"
    },

    # -------------------------------------------------
    # Huertas propias
    # -------------------------------------------------
    "huerta_create_success": {
        "message": "Huerta registrada con éxito. back",
        "type": "success"
    },
    "huerta_update_success": {
        "message": "Huerta actualizada con éxito. back",
        "type": "success"
    },
    "huerta_delete_success": {
        "message": "Huerta eliminada correctamente. back",
        "type": "success"
    },

    # -------------------------------------------------
    # Huertas rentadas
    # -------------------------------------------------
    "huerta_rentada_create_success": {
        "message": "Huerta rentada registrada con éxito.",
        "type": "success"
    },
    "huerta_rentada_update_success": {
        "message": "Huerta rentada actualizada con éxito.",
        "type": "success"
    },
    "huerta_rentada_delete_success": {
        "message": "Huerta rentada eliminada correctamente.",
        "type": "success"
    },

    # -------------------------------------------------
    # Cosechas
    # -------------------------------------------------
    "cosecha_create_success": {
        "message": "Cosecha registrada con éxito.",
        "type": "success"
    },
    "cosecha_update_success": {
        "message": "Cosecha actualizada con éxito.",
        "type": "success"
    },
    "cosecha_delete_success": {
        "message": "Cosecha eliminada correctamente.",
        "type": "success"
    },
    "toggle_cosecha_success": {
        "message": "Estado de la cosecha cambiado con éxito.",
        "type": "success"
    },

    # -------------------------------------------------
    # Categorías de Inversión
    # -------------------------------------------------
    "categoria_inversion_create_success": {
        "message": "Categoría de inversión creada con éxito.",
        "type": "success"
    },
    "categoria_inversion_update_success": {
        "message": "Categoría de inversión actualizada con éxito.",
        "type": "success"
    },
    "categoria_inversion_delete_success": {
        "message": "Categoría de inversión eliminada correctamente.",
        "type": "success"
    },

    # -------------------------------------------------
    # Inversiones
    # -------------------------------------------------
    "inversion_create_success": {
        "message": "Inversión registrada con éxito.",
        "type": "success"
    },
    "inversion_update_success": {
        "message": "Inversión actualizada con éxito.",
        "type": "success"
    },
    "inversion_delete_success": {
        "message": "Inversión eliminada correctamente.",
        "type": "success"
    },

    # -------------------------------------------------
    # Ventas
    # -------------------------------------------------
    "venta_create_success": {
        "message": "Venta registrada con éxito.",
        "type": "success"
    },
    "venta_update_success": {
        "message": "Venta actualizada con éxito.",
        "type": "success"
    },
    "venta_delete_success": {
        "message": "Venta eliminada correctamente.",
        "type": "success"
    },
    
    "propietario_archivado":       {"message": "Propietario archivado correctamente", "type": "success"},
    "propietario_ya_archivado":    {"message": "El propietario ya está archivado",   "type": "info"},
    "propietario_restaurado":      {"message": "Propietario restaurado",             "type": "success"},
    "propietario_no_archivado":    {"message": "El propietario no está archivado",   "type": "info"},
    "propietario_con_dependencias":{"message": "No se puede elimina este propietario, tiene huertas registradas","type": "error"},
    "propietario_delete_success":  {"message": "Propietario eliminado",              "type": "success"},

    # -------------------------------------------------
    # Acciones de Archivado / Restaurado / Restricciones - Huertas
    # -------------------------------------------------
    "huerta_archivada": {
        "message": "Huerta archivada correctamente.",
        "type": "success"
    },
    "huerta_restaurada": {
        "message": "Huerta restaurada correctamente.",
        "type": "success"
    },
    "ya_esta_archivada": {
        "message": "La huerta ya está archivada.",
        "type": "info"
    },
    "ya_esta_activa": {
        "message": "La huerta ya está activa.",
        "type": "info"
    },
    "huerta_debe_estar_archivada": {
        "message": "Debes archivar la huerta antes de poder eliminarla.",
        "type": "error"
    },
    "huerta_con_dependencias": {
        "message": "No se puede eliminar esta huerta, tiene cosechas registradas.",
        "type": "error"
    },


    "temporada_create_success": {
        "message": "Temporada creada correctamente back.",
        "type": "success",
    },
    "temporada_update_success": {
        "message": "Temporada actualizada correctamente back.",
        "type": "info",
    },
    "temporada_delete_success": {
        "message": "Temporada eliminada correctamente back.",
        "type": "success",
    },
    "temporada_finalizada": {
        "message": "Temporada finalizada exitosamente back.",
        "type": "success",
    },
    "temporada_ya_finalizada": {
        "message": "Esta temporada ya fue finalizada back.",
        "type": "warning",
    },
    "temporada_archivada": {
        "message": "Temporada archivada correctamente back.",
        "type": "success",
    },
    "temporada_ya_archivada": {
        "message": "Esta temporada ya está archivada back.",
        "type": "warning",
    },
    "temporada_restaurada": {
        "message": "Temporada restaurada correctamente back.",
        "type": "success",
    },
    "temporada_no_archivada": {
        "message": "Esta temporada ya está activa back.",
        "type": "info",
    },

}
