NOTIFICATION_MESSAGES = {
    # -------------------------------------------------
    # Genéricos
    # -------------------------------------------------
    "validation_error": {
        "message": "Por favor, corrige los errores en los campos back.",
        "type": "error"
    },
    "permission_denied": {
        "message": "No tienes permisos para realizar esta acción en el módulo de huertas.",
        "type": "error",
        "code": 403
    },
    "server_error": {
        "message": "Ha ocurrido un error en el servidor al procesar la solicitud.",
        "type": "error",
        "code": 500
    },
    "data_processed_success": {
        "message": "Operación realizada con éxito.",
        "type": "success"
    },
    "not_found": {
        "message": "Recurso no encontrado.",
        "type": "error",
        "code": 404
    },

    # Reusables de negocio
    "bloqueo_por_temporada_inactiva_o_finalizada": {
        "message": "No se pueden registrar cambios: la temporada está archivada o finalizada.",
        "type": "error"
    },
    "bloqueo_por_cosecha_inactiva_o_finalizada": {
        "message": "No se pueden registrar cambios: la cosecha está archivada o finalizada.",
        "type": "error"
    },
    "bloqueo_por_huerta_archivada": {
        "message": "No se pueden registrar cambios: la huerta está archivada.",
        "type": "error"
    },
    "fecha_fuera_de_rango_hoy_ayer": {
        "message": "La fecha solo puede ser HOY o AYER (máx. 24 h).",
        "type": "error"
    },
    "fecha_posterior_al_inicio_de_la_cosecha": {
        "message": "La fecha debe ser igual o posterior al inicio de la cosecha.",
        "type": "error"
    },

    "conflicto_unicidad_al_restaurar": {
        "message": "No se puede restaurar: existe un registro activo que provocaría duplicidad.",
        "type": "error"
    },
    "operacion_atomica_fallida": {
        "message": "No se pudo completar la operación por una regla de negocio.",
        "type": "error"
    },

    # -------------------------------------------------
    # Propietarios
    # -------------------------------------------------
    "propietario_create_success": {
        "message": "Propietario creado con éxito.",
        "type": "success"
    },
    "propietario_update_success": {
        "message": "Propietario actualizado con éxito.",
        "type": "success"
    },
    "propietario_delete_success": {
        "message": "Propietario eliminado correctamente.",
        "type": "success"
    },
    "propietario_archivado": {
        "message": "Propietario archivado correctamente.",
        "type": "success"
    },
    "propietario_ya_archivado": {
        "message": "El propietario ya está archivado.",
        "type": "error"
    },
    "propietario_restaurado": {
        "message": "Propietario restaurado.",
        "type": "success"
    },
    "propietario_no_archivado": {
        "message": "El propietario no está archivado.",
        "type": "info"
    },
    "propietario_con_dependencias": {
        "message": "No se puede eliminar este propietario; tiene huertas registradas.",
        "type": "error"
    },

    "propietario_campos_invalidos": {
        "message": "Revisa nombre, apellidos y dirección.",
        "type": "error"
    },
    "propietario_telefono_duplicado": {
        "message": "Ese teléfono ya está registrado.",
        "type": "error"
    },
    # -------------------------------------------------
    # Huertas propias
    # -------------------------------------------------
    "huerta_create_success": {
        "message": "Huerta registrada con éxito.",
        "type": "success"
    },
    "huerta_update_success": {
        "message": "Huerta actualizada con éxito.",
        "type": "success"
    },
    "huerta_delete_success": {
        "message": "Huerta eliminada correctamente.",
        "type": "success"
    },
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
        "message": "No se puede eliminar esta huerta; tiene temporadas registradas.",
        "type": "error"
    },
    "no_asignar_a_propietario_archivado": {
        "message": "No puedes asignar huertas a un propietario archivado.",
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
    # Temporadas
    # -------------------------------------------------
    "temporada_create_success": {
        "message": "Temporada creada correctamente.",
        "type": "success"
    },
    "temporada_update_success": {
        "message": "Temporada actualizada correctamente.",
        "type": "success"
    },
    "temporada_delete_success": {
        "message": "Temporada eliminada correctamente.",
        "type": "success"
    },
    "temporada_finalizada": {
        "message": "Temporada finalizada exitosamente.",
        "type": "success"
    },
    "temporada_ya_finalizada": {
        "message": "Esta temporada ya fue finalizada.",
        "type": "warning"
    },
    "temporada_no_finalizada": {
        "message": "No se puede eliminar una temporada en curso.",
        "type": "error"
    },
    "temporada_archivada": {
        "message": "Temporada archivada correctamente.",
        "type": "success"
    },
    "temporada_ya_archivada": {
        "message": "Esta temporada ya está archivada.",
        "type": "warning"
    },
    "temporada_no_archivada": {
        "message": "Esta temporada no está archivada.",
        "type": "info"
    },
    "temporada_restaurada": {
        "message": "Temporada restaurada correctamente.",
        "type": "success"
    },
    "temporada_reactivada": {
        "message": "Temporada reactivada correctamente.",
        "type": "success"
    },
    "temporada_ya_activa": {
        "message": "Esta temporada ya está activa.",
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
    "temporada_con_dependencias": {
        "message": "No se puede eliminar. Tiene cosechas asociadas.",
        "type": "error"
    },
    "huerta_archivada_temporada": {
        "message": "No se puede iniciar una temporada en una huerta archivada.",
        "type": "error"
    },
    "temporada_sin_origen": {
        "message": "Debe asignar una huerta propia o una huerta rentada (no ambas).",
        "type": "error"
    },
    "temporada_con_dos_origenes": {
        "message": "No puede asignar huerta propia y huerta rentada al mismo tiempo.",
        "type": "error"
    },
    # (opcional si lo usas para borrar)
    "temporada_debe_estar_archivada": {
        "message": "Debes archivar la temporada antes de poder eliminarla.",
        "type": "error"
    },

    "temporada_origen_archivado_no_restaurar": {
        "message": "No se puede restaurar una temporada en una huerta  archivada.",
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
    "cosecha_archivada": {
        "message": "Cosecha archivada correctamente.",
        "type": "success"
    },
    "cosecha_restaurada": {
        "message": "Cosecha restaurada correctamente.",
        "type": "success"
    },
    
    "cosecha_reactivada": {
        "message": "Cosecha reactivada correctamente.",
        "type": "success"
    },
    "cosecha_duplicada": {
        "message": "Ya existe una cosecha con ese nombre en esta temporada.",
        "type": "warning"
    },
    "cosecha_ya_archivada": {
        "message": "Esta cosecha ya está archivada.",
        "type": "warning"
    },
    "cosecha_ya_activa": {
        "message": "Esta cosecha ya está activa.",
        "type": "info"
    },
    "cosecha_finalizada": {
        "message": "Cosecha finalizada correctamente.",
        "type": "success"
    },
    "cosecha_ya_finalizada": {
        "message": "Esta cosecha ya está finalizada.",
        "type": "warning"
    },
    "cosecha_no_archivada": {
        "message": "Esta cosecha no está archivada.",
        "type": "info"
    },
    "inversion_debe_estar_archivada": {
        "message": "Debes archivar la inversión antes de poder eliminarla.",
        "type": "error"
    },
    "cosecha_debe_estar_archivada": {
        "message": "Debes archivar la cosecha antes de poder eliminarla.",
        "type": "error"
    },
    "cosecha_con_dependencias": {
        "message": "No se puede eliminar la cosecha: tiene inversiones o ventas registradas.",
        "type": "error"
    },
    "cosecha_limite_temporada": {
        "message": "Se ha alcanzado el límite de cosechas por temporada.",
        "type": "error"
    },
    "no_cosecha_en_temporada_finalizada_o_archivada": {
        "message": "No puedes registrar cosechas en una temporada finalizada o archivada.",
        "type": "error"
    },
    "fechas_inicio_fin_incoherentes": {
        "message": "La fecha de fin no puede ser anterior a la fecha de inicio.",
        "type": "error"
    },
    "cosecha_nombre_duplicado": {
        "message": "Ya existe una cosecha con ese nombre en esta temporada.",
        "type": "error"
    },
    "cosecha_activa_existente": {
        "message": "Ya existe una cosecha activa en esta temporada.",
        "type": "error"
    },
    "toggle_cosecha_success": {
        "message": "Estado de la cosecha cambiado con éxito.",
        "type": "success"
    },

    # -------------------------------------------------
    # Categorías de inversión
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
    "categoria_con_inversiones": {
        "message": "No puedes eliminar la categoría porque tiene inversiones asociadas.",
        "type": "error"
    },
    "categoria_archivada": {
        "message": "Categoría archivada correctamente.",
        "type": "success"
    },
    "categoria_restaurada": {
        "message": "Categoría restaurada.",
        "type": "success"
    },
    "categoria_ya_archivada": {
        "message": "La categoría ya está archivada.",
        "type": "warning"
    },
    "categoria_no_archivada": {
        "message": "La categoría no está archivada.",
        "type": "warning"
    },
    "categoria_archivada_no_seleccionable": {
        "message": "Esta categoría está archivada y no puede seleccionarse.",
        "type": "info"
    },
    "categoria_nombre_duplicado": {
        "message": "Ya existe una categoría con este nombre.",
        "type": "error"
    },
    # NUEVAS para vistas robustas
    "categoria_debe_estar_archivada": {
        "message": "Debes archivar la categoría antes de poder eliminarla.",
        "type": "error"
    },
    "categoria_archivada_no_editar": {
        "message": "No puedes editar una categoría archivada.",
        "type": "error"
    },
    "categoria_nombre_corto": {
        "message": "El nombre de la categoría debe tener al menos 3 caracteres.",
        "type": "error"
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
    "no_inversion_en_temporada_finalizada_o_archivada": {
        "message": "No puedes registrar inversiones en una temporada finalizada o archivada.",
        "type": "error"
    },
    "no_inversion_en_cosecha_finalizada_o_archivada": {
        "message": "No puedes registrar inversiones en una cosecha finalizada o archivada.",
        "type": "error"
    },
    # NUEVAS (pre-checks finos y validaciones específicas)
    "inversion_archivada_no_editar": {
        "message": "No puedes editar una inversión archivada.",
        "type": "error"
    },
    "inversion_temporada_archivada_no_editar": {
        "message": "No puedes editar inversiones de una temporada archivada.",
        "type": "error"
    },
    "inversion_temporada_finalizada_no_editar": {
        "message": "No puedes editar inversiones de una temporada finalizada.",
        "type": "error"
    },
    "inversion_cosecha_archivada_no_editar": {
        "message": "No puedes editar inversiones de una cosecha archivada.",
        "type": "error"
    },
    "inversion_cosecha_finalizada_no_editar": {
        "message": "No puedes editar inversiones de una cosecha finalizada.",
        "type": "error"
    },
    "inversion_temporada_archivada": {
        "message": "No puedes registrar inversiones: la temporada está archivada.",
        "type": "error"
    },
    "inversion_temporada_finalizada": {
        "message": "No puedes registrar inversiones: la temporada está finalizada.",
        "type": "error"
    },
    "inversion_cosecha_archivada": {
        "message": "No puedes registrar inversiones: la cosecha está archivada.",
        "type": "error"
    },
    "inversion_cosecha_finalizada": {
        "message": "No puedes registrar inversiones: la cosecha está finalizada.",
        "type": "error"
    },
    "inversion_temporada_archivada_no_restaurar": {
        "message": "No puedes restaurar inversiones de una temporada archivada.",
        "type": "error"
    },
    "inversion_temporada_finalizada_no_restaurar": {
        "message": "No puedes restaurar inversiones de una temporada finalizada.",
        "type": "error"
    },
    "inversion_cosecha_archivada_no_restaurar": {
        "message": "No puedes restaurar inversiones de una cosecha archivada.",
        "type": "error"
    },
    "inversion_cosecha_finalizada_no_restaurar": {
        "message": "No puedes restaurar inversiones de una cosecha finalizada.",
        "type": "error"
    },
    "inversion_fecha_futura": {
        "message": "La fecha no puede ser futura.",
        "type": "error"
    },
    "inversion_fecha_fuera_de_rango": {
        "message": "La fecha solo puede ser HOY o AYER (máx. 24 h).",
        "type": "error"
    },
    "inversion_fecha_antes_inicio_cosecha": {
        "message": "La fecha debe ser igual o posterior al inicio de la cosecha.",
        "type": "error"
    },
    "inversion_fecha_no_retroceder": {
        "message": "No puedes mover la fecha más atrás que la registrada.",
        "type": "error"
    },
    "inversion_totales_cero": {
        "message": "Los gastos totales deben ser mayores a 0.",
        "type": "error"
    },
    "inversion_campo_obligatorio": {
        "message": "Los campos de gastos son obligatorios.",
        "type": "error"
    },
    "inversion_gasto_negativo": {
        "message": "Los gastos no pueden ser negativos.",
        "type": "error"
    },
    "inversion_temporada_incoherente": {
        "message": "La temporada no coincide con la de la cosecha.",
        "type": "error"
    },
    "inversion_temporada_no_permitida": {
        "message": "No se pueden registrar/editar inversiones en una temporada finalizada o archivada.",
        "type": "error"
    },
    "inversion_huerta_incoherente": {
        "message": "La huerta no coincide con la de la cosecha.",
        "type": "error"
    },
    "inversion_huerta_rentada_incoherente": {
        "message": "La huerta rentada no coincide con la de la cosecha.",
        "type": "error"
    },
    "inversion_origen_propia_en_rentada": {
        "message": "No asignes huerta propia en una cosecha de huerta rentada.",
        "type": "error"
    },
    "inversion_origen_rentada_en_propia": {
        "message": "No asignes huerta rentada en una cosecha de huerta propia.",
        "type": "error"
    },
    "inversion_cosecha_sin_origen": {
        "message": "La cosecha no tiene origen (huerta/huerta rentada) definido.",
        "type": "error"
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
    "venta_debe_estar_archivada": {
        "message": "Debes archivar la venta antes de poder eliminarla.",
        "type": "error"
    },
    "no_venta_en_temporada_finalizada_o_archivada": {
        "message": "No puedes registrar ventas en una temporada finalizada o archivada.",
        "type": "error"
    },
    "no_venta_en_cosecha_finalizada_o_archivada": {
        "message": "No puedes registrar ventas en una cosecha finalizada o archivada.",
        "type": "error"
    },
    "precio_por_caja_debe_ser_mayor_a_cero": {
        "message": "El precio por caja debe ser mayor que 0.",
        "type": "error"
    },
    "num_cajas_debe_ser_mayor_a_cero": {
        "message": "El número de cajas debe ser mayor que 0.",
        "type": "error"
    },
    "gasto_no_puede_ser_negativo": {
        "message": "El gasto no puede ser negativo.",
        "type": "error"
    },
    "ganancia_neta_no_puede_ser_negativa": {
        "message": "La ganancia neta no puede ser negativa.",
        "type": "error"
    },

    # NUEVAS (ventas robustas: pre-checks y validaciones específicas)
    "venta_archivada_no_editar": {
        "message": "No puedes editar una venta archivada.",
        "type": "error"
    },
    "venta_temporada_archivada_no_editar": {
        "message": "No puedes editar ventas de una temporada archivada.",
        "type": "error"
    },
    "venta_temporada_finalizada_no_editar": {
        "message": "No puedes editar ventas de una temporada finalizada.",
        "type": "error"
    },
    "venta_cosecha_archivada_no_editar": {
        "message": "No puedes editar ventas de una cosecha archivada.",
        "type": "error"
    },
    "venta_cosecha_finalizada_no_editar": {
        "message": "No puedes editar ventas de una cosecha finalizada.",
        "type": "error"
    },
    "venta_contexto_temporada_archivada": {
        "message": "No puedes registrar ventas: la temporada está archivada.",
        "type": "error"
    },
    "venta_contexto_temporada_finalizada": {
        "message": "No puedes registrar ventas: la temporada está finalizada.",
        "type": "error"
    },
    "venta_contexto_cosecha_archivada": {
        "message": "No puedes registrar ventas: la cosecha está archivada.",
        "type": "error"
    },
    "venta_contexto_cosecha_finalizada": {
        "message": "No puedes registrar ventas: la cosecha está finalizada.",
        "type": "error"
    },
    "venta_fecha_fuera_de_rango": {
        "message": "La fecha solo puede ser HOY o AYER (máx. 24 h).",
        "type": "error"
    },
    "venta_fecha_antes_inicio_cosecha": {
        "message": "La fecha debe ser igual o posterior al inicio de la cosecha.",
        "type": "error"
    },
    "venta_num_cajas_invalido": {
        "message": "El número de cajas debe ser mayor que 0.",
        "type": "error"
    },
    "venta_precio_invalido": {
        "message": "El precio por caja debe ser mayor o igual a 0.",
        "type": "error"
    },
    "venta_gasto_invalido": {
        "message": "El gasto debe ser mayor o igual a 0.",
        "type": "error"
    },
    "venta_ganancia_negativa": {
        "message": "La ganancia neta no puede ser negativa.",
        "type": "error"
    },
    "venta_temporada_incoherente": {
        "message": "La temporada no coincide con la de la cosecha.",
        "type": "error"
    },
    "venta_temporada_no_permitida": {
        "message": "No se pueden registrar/editar ventas en una temporada finalizada o archivada.",
        "type": "error"
    },
    "venta_huerta_incoherente": {
        "message": "La huerta no coincide con la de la cosecha.",
        "type": "error"
    },
    "venta_huerta_rentada_incoherente": {
        "message": "La huerta rentada no coincide con la de la cosecha.",
        "type": "error"
    },
    "venta_origen_ambos_definidos": {
        "message": "Define solo huerta o huerta rentada, no ambos.",
        "type": "error"
    },
    "venta_origen_indefinido": {
        "message": "Debe definirse huerta u huerta rentada según la cosecha.",
        "type": "error"
    },
    "venta_cosecha_requerida": {
        "message": "La cosecha es requerida para registrar una venta.",
        "type": "error"
    },

    # -------------------------------------------------
    # Coherencias entre entidades (reusables)
    # -------------------------------------------------
    "temporada_no_coincide_con_cosecha": {
        "message": "La temporada no coincide con la temporada de la cosecha.",
        "type": "error"
    },
    "huerta_no_coincide_con_cosecha": {
        "message": "La huerta no coincide con la huerta de la cosecha.",
        "type": "error"
    },
    "huerta_rentada_no_coincide_con_cosecha": {
        "message": "La huerta rentada no coincide con la de la cosecha.",
        "type": "error"
    },
    "cosecha_sin_origen": {
        "message": "La cosecha no tiene origen (huerta/huerta rentada) definido.",
        "type": "error"
    },
    
# --- Propietarios (complementos de validación) ---
"propietario_campos_invalidos": {
    "message": "Revisa nombre, apellidos y dirección.",
    "type": "error"
},
"propietario_telefono_duplicado": {
    "message": "Ese teléfono ya está registrado.",
    "type": "error"
},

# --- Huertas propias (complementos de validación/duplicado) ---
"huerta_campos_invalidos": {
    "message": "Revisa nombre, ubicación, variedades y hectáreas.",
    "type": "error"
},
"huerta_propietario_archivado": {
    "message": "No puedes asignar huertas a un propietario archivado.",
    "type": "error"
},
"huerta_duplicada": {
    "message": "Ya existe una huerta activa con ese nombre y ubicación para el mismo propietario.",
    "type": "error"
},

# --- Huertas rentadas (complementos de validación/duplicado) ---
"huerta_rentada_campos_invalidos": {
    "message": "Revisa nombre, ubicación, variedades y hectáreas.",
    "type": "error"
},
"huerta_rentada_propietario_archivado": {
    "message": "No puedes asignar huertas rentadas a un propietario archivado.",
    "type": "error"
},
"huerta_rentada_monto_invalido": {
    "message": "El monto de la renta debe ser mayor a 0.",
    "type": "error"
},
"huerta_rentada_duplicada": {
    "message": "Ya existe una huerta rentada activa con ese nombre y ubicación para el mismo propietario.",
    "type": "error"
},


"reporte_generado_exitosamente": {
    "message": "El reporte se generó exitosamente.",
    "type": "success"
}
    
}
