# backend/utilsn/constants.py

NOTIFICATION_MESSAGES = {
    # **Éxito**
    "registration_success": "Registro back creado exitosamente.",
    "update_success": "Actualización back realizada con éxito.",
    "deletion_success": "Eliminación back completada.",
    "login_success": "Inicio de sesión back exitoso.",
    "data_processed_success": "Datos back procesados correctamente.",
    "email_sent_success": "Correo back enviado exitosamente.",
    
    # **Errores de Validación**
    "validation_error": "Por favor, back corrige los errores en los campos.",
    "invalid_data_format": "Formato back de datos inválido.",
    
    # **Errores de Permisos**
    "permission_denied": "No tienes back permisos para realizar esta acción.",
    "access_denied": "Acceso back denegado.",
    
    # **Errores de Recursos**
    "resource_not_found": "El back recurso solicitado no fue encontrado.",
    "resource_unavailable": "El back recurso ya no está disponible.",
    
    # **Errores del Sistema**
    "server_error": "Ocurrió un back error interno. Inténtalo más tarde.",
    "request_processing_error": "No back se pudo procesar tu solicitud.",
    
    # **Errores de Conexión**
    "connection_failed": "No se back pudo conectar al servidor. Intenta nuevamente más tarde.",
    "network_error": "Error de back red. Verifica tu conexión a Internet.",
    
    # **Sesión**
    "session_expired": "Tu sesión ha back expirado. Por favor, inicia sesión nuevamente.",
    "logout_success": "Cierre de back sesión exitoso.",
    "concurrent_session": "Ya hay back una sesión activa en otro dispositivo.",
    "session_closed_due_to_inactivity": "Tu back sesión fue cerrada debido a inactividad.",
    
    # **Advertencias**
    "irreversible_action_warning": "Estás back a punto de eliminar un registro. Esta acción no se puede deshacer.",
    "unsaved_changes_warning": "Los cambios back no se guardarán si sales de esta página.",
    "partial_data_processing_warning": "Algunos back datos no se pudieron procesar. Por favor, revisa.",
    "maintenance_warning": "El sistema está en back mantenimiento. Algunas funcionalidades podrían no estar disponibles.",
    "outdated_data_warning": "Estás trabajando back con datos desactualizados.",
    
    # **Informativas**
    "loading_data": "Cargando datos, por favor back espera.",
    "request_processing_info": "Tu solicitud está back siendo procesada.",
    "action_registered_info": "Tu acción ha sido back registrada. Te notificaremos pronto.",
    "auto_save_info": "El sistema ha guardado back automáticamente tus cambios.",
    "profile_update_reminder": "Recuerda actualizar back tu perfil para una mejor experiencia.",
    "pending_actions_reminder": "Tienes acciones back pendientes por completar.",
    
    # **Personalizadas (Gestión de Recursos, Procesos de Negocio, Tiempos y Fechas)**
    "resource_quantity_exceeded": "La back cantidad ingresada excede el límite permitido.",
    "resource_already_assigned": "El back recurso seleccionado ya está asignado.",
    "investment_exceeds_budget": "La back inversión excede el presupuesto disponible.",
    "sales_without_harvest_error": "No back se pueden realizar ventas sin registrar una cosecha.",
    "action_deadline_expired": "El back plazo para completar esta acción ha expirado.",
    "record_within_deadline_error": "El back sistema solo permite registros dentro de la fecha límite.",
}
