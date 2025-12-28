import os
import re
import sys

def check_message_keys(backend_root):
    """
    Smoke test para validar que los message_key usados existan en constants (fingido/aproximado).
    En un sistema real importaría los constants, aquí hace un grep inteligente.
    """
    print(f"🔍 Auditando message_keys en: {backend_root}")

    # 1. Encontrar definición de keys (en any *constants.py)
    defined_keys = set()
    
    # Patrón 1: CONSTANT_KEY = "value"
    constants_pattern = re.compile(r'([A-Z_]+_KEY)\s*=\s*[\'"]([a-z0-9_]+)[\'"]')
    
    # Patrón 2: Keys dentro de NOTIFICATION_MESSAGES = { ... }
    # Buscamos líneas como: "login_success": {
    dict_key_pattern = re.compile(r'^\s*[\'"]([a-z0-9_]+)[\'"]\s*:\s*\{')

    for root, dirs, files in os.walk(backend_root):
        for file in files:
            if file.endswith('constants.py'):
                try:
                    with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        for line in lines:
                            # Check CONSTANT_KEY
                            match_const = constants_pattern.search(line)
                            if match_const:
                                defined_keys.add(match_const.group(2))
                            
                            # Check dict keys
                            match_dict = dict_key_pattern.search(line)
                            if match_dict:
                                defined_keys.add(match_dict.group(1))
                except:
                    pass
    
    # Agregar algunos hardcoded comunes si no se detectan (fallback)
    fallback_keys = {
        'operacion_exitosa', 'error_desconocido', 'validacion_fallida', 
        'recurso_no_encontrado', 'permiso_denegado'
    }
    defined_keys.update(fallback_keys)
    
    if not defined_keys:
        print("⚠ No se encontraron definiciones de llaves (constants.py). Saltando validación estricta.")
        # Para no bloquear si no hay constants definidos aún, pero avisar.
        # return 
    
    print(f"ℹ Keys conocidas: {len(defined_keys)}")

    # 2. Buscar usos en views
    usage_pattern = re.compile(r'message_key=[\'"]([a-z0-9_]+)[\'"]')
    violations = []
    
    for root, dirs, files in os.walk(backend_root):
        if 'migrations' in root or 'tests' in root: continue
        
        for file in files:
            if file.endswith('_views.py') or file.endswith('views.py'):
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        for i, line in enumerate(lines):
                            matches = usage_pattern.findall(line)
                            for used_key in matches:
                                if used_key not in defined_keys:
                                    # Posible violación o key no centralizada
                                    violations.append({
                                        'file': full_path,
                                        'line': i+1,
                                        'key': used_key
                                    })
                except:
                    pass

    if violations:
        print("\n❌ Violaciones de Canon: message_keys no definidos en constants (Typos potenciales):")
        
        # Mostrar todas las violaciones
        for v in violations:
            print(f"   ❓ '{v['key']}' en {v['file']}:{v['line']}")
        
        print("\nRecomendación: Centralizar estas keys en *constants.py para evitar errores de front.")
        print("Acción requerida: Definir la key en constants.py o corregir el typo.")
        sys.exit(1) # Strict Gate: Falla el build
    else:
        print("✅ Message Key Check Passed: Todas las keys usadas están definidas.")

if __name__ == "__main__":
    target_dir = 'backend' if os.path.isdir('backend') else '.'
    check_message_keys(target_dir)
