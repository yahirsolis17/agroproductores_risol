NOTIFICATION_MESSAGES = {
    # --- Autenticacion ---
    "login_success": {
        "message": "Inicio de sesion exitoso.",
        "type": "success",
        "action": "redirect",
        "target": "/dashboard",
    },
    "logout_success": {
        "message": "Sesion cerrada correctamente.",
        "type": "info",
        "action": "redirect",
        "target": "/login",
    },
    "password_change_required": {
        "message": "Debes cambiar tu contrasena antes de continuar.",
        "type": "warning",
        "action": "redirect",
        "target": "/change-password",
    },
    "usuario_no_archivado": {
        "message": "El usuario no esta archivado.",
        "type": "error",
    },
    "usuario_archivado": {
        "message": "Usuario archivado correctamente.",
        "type": "success",
    },
    "usuario_restaurado": {
        "message": "Usuario restaurado correctamente.",
        "type": "success",
    },
    "usuario_con_historial": {
        "message": "No se puede eliminar un usuario con historial.",
        "type": "error",
    },
    "usuario_ya_archivado": {
        "message": "El usuario ya se encuentra archivado.",
        "type": "warning",
    },

    # --- Usuario ---
    "register_success": {
        "message": "Usuario registrado correctamente.",
        "type": "success",
        "action": "redirect",
    },
    "password_change_success": {
        "message": "Contrasena actualizada correctamente.",
        "type": "success",
        "action": "redirect",
        "target": "/dashboard",
    },
    "permission_update_success": {
        "message": "Permisos actualizados correctamente.",
        "type": "success",
    },

    # --- CRUD generales ---
    "create_success": {
        "message": "Registro creado correctamente.",
        "type": "success",
    },
    "update_success": {
        "message": "Actualizacion realizada con exito.",
        "type": "success",
    },
    "delete_success": {
        "message": "Eliminacion completada correctamente.",
        "type": "success",
    },

    # --- Errores ---
    "validation_error": {
        "message": "Por favor, corrige los errores en los campos.",
        "type": "error",
    },
    "permission_denied": {
        "message": "No tienes permisos para realizar esta accion.",
        "type": "error",
        "code": 403,
    },
    "invalid_permissions": {
        "message": "Algunos permisos no existen o presentan colisiones.",
        "type": "error",
        "code": 400,
    },
    "server_error": {
        "message": "Ha ocurrido un error en el servidor.",
        "type": "error",
        "code": 500,
    },
    "authentication_required": {
        "message": "Debes iniciar sesion para continuar.",
        "type": "error",
        "code": 401,
    },
    "not_found": {
        "message": "Recurso no encontrado.",
        "type": "error",
        "code": 404,
    },
    "too_many_requests": {
        "message": "Demasiadas solicitudes. Intenta nuevamente mas tarde.",
        "type": "warning",
        "code": 429,
    },
    "unexpected_error": {
        "message": "Ha ocurrido un error inesperado al procesar la solicitud.",
        "type": "error",
        "code": 500,
    },

    # --- Utilidades canon ---
    "fetch_success": {
        "message": "Datos obtenidos correctamente.",
        "type": "success",
    },
    "silent_response": {
        "message": "",
        "type": "info",
    },
}
