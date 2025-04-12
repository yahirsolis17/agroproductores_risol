# gestion_usuarios/utils/throttles.py

from rest_framework.throttling import UserRateThrottle

class BaseUserThrottle(UserRateThrottle):
    scope = 'default_user'
    
class LoginThrottle(UserRateThrottle):
    scope = 'login'

class SensitiveActionThrottle(UserRateThrottle):
    scope = 'sensitive_action'

class AdminOnlyThrottle(UserRateThrottle):
    scope = 'admin_only'

class RefreshTokenThrottle(UserRateThrottle):
    scope = 'refresh_token'

