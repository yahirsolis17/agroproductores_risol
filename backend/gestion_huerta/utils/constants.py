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

    "not_found": {
        "message": "Recurso no encontrado.",
        "type": "error",
        "code": 404
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
    "propietario_archivado": {
        "message": "Propietario archivado correctamente",
        "type": "success"
    },
    "propietario_ya_archivado": {
        "message": "El propietario ya está archivado",
        "type": "info"
    },
    "propietario_restaurado": {
        "message": "Propietario restaurado",
        "type": "success"
    },
    "propietario_no_archivado": {
        "message": "El propietario no está archivado",
        "type": "info"
    },
    "propietario_con_dependencias": {
        "message": "No se puede elimina este propietario, tiene huertas registradas",
        "type": "error"
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
    "huerta_archivada": {
        "message": "Huerta archivada correctamente back.",
        "type": "success"
    },
    "huerta_restaurada": {
        "message": "Huerta restaurada correctamente back.",
        "type": "success"
    },
    "ya_esta_archivada": {
        "message": "La huerta ya está archivada back.",
        "type": "info"
    },
    "ya_esta_activa": {
        "message": "La huerta ya está activa back.",
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
    "huerta_rentada_archivada": {
        "message": "No se puede iniciar una temporada en una huerta rentada archivada.",
        "type": "error"
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

    # -------------------------------------------------
    # Temporadas
    # -------------------------------------------------
    "temporada_create_success": {
        "message": "Temporada creada correctamente back.",
        "type": "success"
    },
    "temporada_delete_success": {
        "message": "Temporada eliminada correctamente back.",
        "type": "success"
    },
    "temporada_finalizada": {
        "message": "Temporada finalizada exitosamente back.",
        "type": "success"
    },
    "temporada_ya_finalizada": {
        "message": "Esta temporada ya fue finalizada back.",
        "type": "warning"
    },
    "temporada_no_finalizada": {
        "message": "Esta temporada no está finalizada back.",
        "type": "info"
    },
    "temporada_archivada": {
        "message": "Temporada archivada correctamente back.",
        "type": "success"
    },
    "temporada_ya_archivada": {
        "message": "Esta temporada ya está archivada back.",
        "type": "warning"
    },
    "temporada_no_archivada": {
        "message": "Esta temporada no está archivada back.",
        "type": "info"
    },
    "temporada_restaurada": {
        "message": "Temporada restaurada correctamente back.",
        "type": "success"
    },
    "temporada_reactivada": {
        "message": "Temporada reactivada correctamente back.",
        "type": "success"
    },
    "temporada_ya_activa": {
        "message": "Esta temporada ya está activa back.",
        "type": "info"
    },
    "temporada_create_error": {
        "message": "Error al crear la temporada. Por favor, revisa los datos.",
        "type": "error"
    },
    "temporada_duplicada": {
        "message": "Ya existe una temporada para este año y esta huerta.",
        "type": "error"
    },
    "huerta_archivada_temporada": {
        "message": "No se puede iniciar una temporada en una huerta archivada.",
        "type": "error"
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

    # Archivado / Restauración
    "cosecha_archivada": {
        "message": "Cosecha archivada correctamente.",
        "type": "success"
    },
    "cosecha_restaurada": {
        "message": "Cosecha restaurada correctamente.",
        "type": "success"
    },
    "cosecha_ya_archivada": {
        "message": "Esta cosecha ya está archivada.",
        "type": "warning"
    },
    "cosecha_ya_activa": {
        "message": "Esta cosecha ya está activa.",
        "type": "info"
    },
    "cosecha_debe_estar_archivada": {
        "message": "Debes archivar la cosecha antes de poder eliminarla.",
        "type": "error"
    },
    "cosecha_con_dependencias": {
        "message": "No se puede eliminar la cosecha: tiene inversiones o ventas registradas.",
        "type": "error"
    },

    # Finalización / Reactivación (toggle)
    "cosecha_finalizada": {
        "message": "Cosecha finalizada exitosamente.",
        "type": "success"
    },
    "cosecha_reactivada": {
        "message": "Cosecha reactivada correctamente.",
        "type": "success"
    },

    # (Opcional: mantener por compatibilidad si algún lugar del FE la usa)
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
    "inversion_archivada": {
        "message": "Inversión archivada correctamente.",
        "type": "success"
    },
    "inversion_restaurada": {
        "message": "Inversión restaurada correctamente.",
        "type": "success"
    },
    "inversion_ya_archivada": {
        "message": "Esta inversión ya está archivada.",
        "type": "info"
    },
    "inversion_no_archivada": {
        "message": "Esta inversión no está archivada.",
        "type": "info"
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
    "venta_archivada": {
        "message": "Venta archivada correctamente.",
        "type": "success"
    },
    "venta_restaurada": {
        "message": "Venta restaurada correctamente.",
        "type": "success"
    },
    "venta_ya_archivada": {
        "message": "Esta venta ya está archivada.",
        "type": "info"
    },
    "venta_no_archivada": {
        "message": "Esta venta no está archivada.",
        "type": "info"
    },

    # -------------------------------------------------
    # Temporadas
    # -------------------------------------------------
    "temporada_create_success": {
        "message": "Temporada creada correctamente back.",
        "type": "success"
    },
    "temporada_update_success": {
        "message": "Temporada actualizada correctamente back.",
        "type": "success"
    },
    "temporada_delete_success": {
        "message": "Temporada eliminada correctamente back.",
        "type": "success"
    },
    "temporada_finalizada": {
        "message": "Temporada finalizada exitosamente back.",
        "type": "success"
    },
    "temporada_reactivada": {
        "message": "Temporada reactivada correctamente back.",
        "type": "success"
    },
    "temporada_archivada": {
        "message": "Temporada archivada correctamente back.",
        "type": "success"
    },
    "temporada_restaurada": {
        "message": "Temporada restaurada correctamente back.",
        "type": "success"
    },
    "temporada_duplicada": {
        "message": "Ya existe una temporada para este año y esta huerta.",
        "type": "error"
    },
    "temporada_con_dependencias": {
        "message": "No se puede eliminar. Tiene cosechas asociadas.",
        "type": "error"
    },
    "huerta_archivada_temporada": {
        "message": "No se puede iniciar una temporada en una huerta archivada.",
        "type": "error"
    }
}