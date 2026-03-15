# agroproductores_risol/settings.py
"""
Django settings for agroproductores_risol project.
"""

from datetime import timedelta
from pathlib import Path
import os

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

SETTINGS_DIR = Path(__file__).resolve().parent
BASE_DIR = SETTINGS_DIR.parent
_WINDOWS_DLL_HANDLES = []

load_dotenv(SETTINGS_DIR / ".env")


def configure_windows_weasyprint() -> None:
    """Expose MSYS2 DLLs to Python so WeasyPrint can load on Windows."""
    if os.name != "nt" or not hasattr(os, "add_dll_directory"):
        return

    raw_dirs = os.getenv("WEASYPRINT_DLL_DIRECTORIES", "")
    candidates = [Path(item.strip()) for item in raw_dirs.split(os.pathsep) if item.strip()]
    default_dir = Path("C:/msys64/mingw64/bin")
    if default_dir.exists() and default_dir not in candidates:
        candidates.append(default_dir)

    for candidate in candidates:
        if not candidate.exists():
            continue
        try:
            _WINDOWS_DLL_HANDLES.append(os.add_dll_directory(str(candidate)))
        except OSError:
            continue

    if not raw_dirs and default_dir.exists():
        os.environ["WEASYPRINT_DLL_DIRECTORIES"] = str(default_dir)


configure_windows_weasyprint()


def env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def get_required_env(name: str) -> str:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        raise ImproperlyConfigured(f"Missing required environment variable: {name}")
    return raw.strip()


def env_bool_required(name: str) -> bool:
    raw = get_required_env(name)
    value = raw.lower()
    if value not in {"1", "0", "true", "false", "yes", "no", "on", "off"}:
        raise ImproperlyConfigured(
            f"Invalid boolean value for {name}: {raw}. Use true/false."
        )
    return value in {"1", "true", "yes", "on"}


def env_list_required(name: str) -> list[str]:
    items = [item.strip() for item in get_required_env(name).split(",") if item.strip()]
    if not items:
        raise ImproperlyConfigured(f"Environment variable {name} must not be empty.")
    return items


def _merge_init_command(existing: str | None, command: str) -> str:
    if not existing:
        return command
    cleaned = existing.rstrip().rstrip(";")
    command_clean = command.rstrip().rstrip(";")
    return f"{cleaned}; {command_clean};"


def build_database_config() -> dict:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        config = dj_database_url.parse(database_url, conn_max_age=600)
    else:
        required_db_vars = ["DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT"]
        missing = [name for name in required_db_vars if not os.getenv(name, "").strip()]
        if missing:
            missing_str = ", ".join(missing)
            raise ImproperlyConfigured(
                "Database configuration is required. Set DATABASE_URL or all of: "
                f"{missing_str}."
            )
        config = {
            "ENGINE": "django.db.backends.mysql",
            "NAME": get_required_env("DB_NAME"),
            "USER": get_required_env("DB_USER"),
            "PASSWORD": get_required_env("DB_PASSWORD"),
            "HOST": get_required_env("DB_HOST"),
            "PORT": get_required_env("DB_PORT"),
            "CONN_MAX_AGE": 600,
        }

    config.setdefault("CONN_MAX_AGE", 600)

    if config.get("ENGINE") == "django.db.backends.mysql":
        options = config.setdefault("OPTIONS", {})
        options["charset"] = options.get("charset", "utf8mb4")
        options["init_command"] = _merge_init_command(
            options.get("init_command"),
            "SET sql_mode='STRICT_TRANS_TABLES,STRICT_ALL_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ZERO_DATE,NO_ZERO_IN_DATE'",
        )

    config["TEST"] = {"NAME": get_required_env("DB_TEST_NAME")}
    return config


DEBUG = env_bool_required("DJANGO_DEBUG")
ENABLE_API_DOCS = env_bool("DJANGO_ENABLE_API_DOCS", DEBUG)
SECRET_KEY = get_required_env("DJANGO_SECRET_KEY")
ALLOWED_HOSTS = env_list_required("DJANGO_ALLOWED_HOSTS")

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)

INSTALLED_APPS = [
    "gestion_usuarios",
    "gestion_huerta",
    "gestion_bodega",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "django_filters",
    "rest_framework_simplejwt",
    "rest_framework.authtoken",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "drf_spectacular_sidecar",
]

SPECTACULAR_SETTINGS = {
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "REDOC_DIST": "SIDECAR",
}

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "agroproductores_risol.urls"

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "agroproductores_risol" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "agroproductores_risol.wsgi.application"

DATABASES = {
    "default": build_database_config(),
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "agroproductores_risol.utils.pagination.GenericPagination",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "agroproductores_risol.utils.exception_handler.canonical_exception_handler",
    "PAGE_SIZE": 10,
    "DEFAULT_THROTTLE_CLASSES": [
        "gestion_usuarios.utils.throttles.BaseUserThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "default_user": "50000/day",
        "login": "20/min",
        "sensitive_action": "50/hour",
        "admin_only": "100/day",
        "refresh_token": "20/hour",
        "permissions": "30/min",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "USER_AUTHENTICATION_RULE": "rest_framework_simplejwt.authentication.default_user_authentication_rule",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
    "SLIDING_TOKEN_REFRESH_EXP_CLAIM": "refresh_exp",
    "SLIDING_TOKEN_LIFETIME": timedelta(minutes=60),
    "SLIDING_TOKEN_REFRESH_LIFETIME": timedelta(days=7),
}

AUTH_USER_MODEL = "gestion_usuarios.Users"
MESSAGE_STORAGE = "django.contrib.messages.storage.session.SessionStorage"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LOGOUT_REDIRECT_URL = "gestion_usuarios:login"
LOGIN_URL = "gestion_usuarios:login"
LOGIN_REDIRECT_URL = "/redirect_dashboard/"

LANGUAGE_CODE = "es-mx"
TIME_ZONE = "America/Mexico_City"
USE_I18N = True
USE_L10N = True
USE_TZ = True

USE_THOUSAND_SEPARATOR = True
DECIMAL_SEPARATOR = "."
THOUSAND_SEPARATOR = ","
NUMBER_GROUPING = 3

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
SILENCED_SYSTEM_CHECKS = ["models.W036"]

is_secure_env = env_bool("DJANGO_SECURE_COOKIES", not DEBUG)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = is_secure_env
CSRF_COOKIE_SECURE = env_bool("DJANGO_CSRF_COOKIE_SECURE", is_secure_env)
CSRF_COOKIE_HTTPONLY = False
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "same-origin"
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", not DEBUG)
SECURE_HSTS_SECONDS = env_int("DJANGO_SECURE_HSTS_SECONDS", 31536000 if not DEBUG else 0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", not DEBUG)
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", False)
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
SUPPRESS_SERVER_ACCESS_LOGS = env_bool("DJANGO_SUPPRESS_SERVER_ACCESS_LOGS", DEBUG)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "loggers": {
        "django.server": {
            "handlers": ["console"],
            "level": "ERROR" if SUPPRESS_SERVER_ACCESS_LOGS else "INFO",
            "propagate": False,
        },
    },
}
