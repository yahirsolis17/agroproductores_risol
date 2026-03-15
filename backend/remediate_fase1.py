#!/usr/bin/env python3
"""
Script de Remediación Automática - FASE 1
Aplica todos los cambios críticos de seguridad y configuración
Ejecución: python remediate_fase1.py [--dry-run]
"""

import os
import sys
import re
from pathlib import Path
from typing import Tuple

REPO_ROOT = Path(__file__).parent
BACKEND_ROOT = REPO_ROOT / "backend"

FILES_TO_MODIFY = {
    "settings.py": BACKEND_ROOT / "agroproductores_risol" / "settings.py",
    "permissions.py": BACKEND_ROOT / "gestion_bodega" / "permissions.py",
    "models.py": BACKEND_ROOT / "gestion_bodega" / "models.py",
}

CHANGES = {
    "settings.py": [
        {
            "name": "DEBUG = False",
            "old": 'DEBUG = env_bool("DJANGO_DEBUG", True)',
            "new": 'DEBUG = env_bool("DJANGO_DEBUG", False)',
            "critical": True,
        },
        {
            "name": "Validación env vars",
            "old": "CORS_ALLOW_ALL_ORIGINS = False",
            "new": '''# ───────────────────────────────────────────────────────────────────────────
# Validación en Startup: variables críticas deben ser explícitas
# ───────────────────────────────────────────────────────────────────────────
from django.core.exceptions import ImproperlyConfigured

_REQUIRED_ENV_VARS = ["DJANGO_SECRET_KEY", "DJANGO_ALLOWED_HOSTS", "DJANGO_DEBUG"]
for var in _REQUIRED_ENV_VARS:
    if var == "DJANGO_SECRET_KEY" and SECRET_KEY.startswith("risol-local-dev-only"):
        raise ImproperlyConfigured(
            f"SECURITY RISK: {var} using insecure default. "
            f"Set via environment variable."
        )

CORS_ALLOW_ALL_ORIGINS = False''',
            "critical": True,
        },
    ],
    
    "permissions.py": [
        {
            "name": "Eliminar fallback inseguro",
            "old": '''from rest_framework.permissions import BasePermission

# Estos vienen del módulo central de usuarios (ya usados en el resto del repo).
# No reinventamos la rueda: conservamos el mismo contrato.
try:
    from gestion_usuarios.permissions import IsAdmin, IsUser, HasModulePermission
except Exception:  # pragma: no cover
    # Fallbacks ultra mínimos para entornos donde aún no esté disponible el módulo:
    from rest_framework.permissions import SAFE_METHODS

    class IsAdmin(BasePermission):
        def has_permission(self, request, view):
            return getattr(request.user, "is_authenticated", False) and getattr(request.user, "role", None) == "admin"

    class IsUser(BasePermission):
        def has_permission(self, request, view):
            return getattr(request.user, "is_authenticated", False) and getattr(request.user, "role", None) in {"admin", "usuario"}

    class HasModulePermission(BasePermission):
        """
        Fallback: permite lectura a cualquiera autenticado y escribe solo admin.
        El real en `gestion_usuarios.permissions` valida codenames por acción.
        """
        def has_permission(self, request, view):
            if request.method in SAFE_METHODS:
                return getattr(request.user, "is_authenticated", False)
            return getattr(request.user, "role", None) == "admin"''',
            "new": '''from rest_framework.permissions import BasePermission

# Estos vienen del módulo central de usuarios (ya usados en el resto del repo).
# NO hay fallback - si falla, Django startup fails y lo vemos en logs.
from gestion_usuarios.permissions import IsAdmin, IsUser, HasModulePermission''',
            "critical": True,
        },
    ],
}

def backup_file(filepath: Path) -> Path:
    with open(filepath, "r", encoding="utf-8") as src:
        with open(filepath.with_suffix(filepath.suffix + ".backup"), "w", encoding="utf-8") as dst:
            dst.write(src.read())
    return filepath.with_suffix(filepath.suffix + ".backup")

def apply_change(filepath: Path, change: dict, dry_run: bool = False) -> Tuple[bool, str]:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        if change["old"] not in content:
            return False, f"Pattern not found"
        
        new_content = content.replace(change["old"], change["new"])
        
        if not dry_run:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
        
        return True, "✅ OK"
    except Exception as e:
        return False, f"❌ Error: {str(e)}"

def main():
    dry_run = "--dry-run" in sys.argv
    mode = "DRY-RUN" if dry_run else "APPLY"
    
    print(f"\n{'='*70}")
    print(f"  REMEDIACIÓN FASE 1 - {mode}")
    print(f"{'='*70}\n")
    
    print("[1/3] Creando backups...\n")
    for name, filepath in FILES_TO_MODIFY.items():
        if not filepath.exists():
            print(f"  ❌ {name}: NO ENCONTRADO")
            continue
        backup = backup_file(filepath)
        print(f"  ✅ {name}")
    
    print(f"\n[2/3] Aplicando cambios...\n")
    total_ok = 0
    total_fail = 0
    
    for filename, changes_list in CHANGES.items():
        filepath = FILES_TO_MODIFY.get(filename)
        if not filepath or not filepath.exists():
            continue
        
        print(f"  📄 {filename}")
        for change in changes_list:
            critical = "🔴" if change["critical"] else "🟡"
            print(f"    {critical} {change['name']}... ", end="")
            success, msg = apply_change(filepath, change, dry_run)
            print(msg)
            if success:
                total_ok += 1
            else:
                total_fail += 1
    
    print(f"\n[3/3] Resumen\n")
    print(f"  ✅ Cambios OK: {total_ok}")
    print(f"  ❌ Cambios fallidos: {total_fail}")
    if dry_run:
        print(f"  🔷 DRY-RUN - Sin cambios guardados")
        print(f"\n  Ejecuta sin --dry-run para aplicar:\n    python remediate_fase1.py\n")
    
    print(f"{'='*70}\n")
    return 0 if total_fail == 0 else 1

if __name__ == "__main__":
    sys.exit(main())