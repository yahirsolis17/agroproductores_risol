import os
import re
import sys


def check_message_keys(backend_root):
    """
    Smoke test para validar que los message_key usados existan en constants.
    """
    print(f"[AUDIT] Auditando message_keys en: {backend_root}")

    defined_keys = set()
    constants_pattern = re.compile(r'([A-Z_]+_KEY)\s*=\s*[\'"]([a-z0-9_]+)[\'"]')
    dict_key_pattern = re.compile(r'^\s*[\'"]([a-z0-9_]+)[\'"]\s*:\s*\{')

    for root, _dirs, files in os.walk(backend_root):
        for file in files:
            if not file.endswith("constants.py"):
                continue
            try:
                with open(os.path.join(root, file), "r", encoding="utf-8") as f:
                    for line in f:
                        match_const = constants_pattern.search(line)
                        if match_const:
                            defined_keys.add(match_const.group(2))

                        match_dict = dict_key_pattern.search(line)
                        if match_dict:
                            defined_keys.add(match_dict.group(1))
            except Exception:
                continue

    fallback_keys = {
        "operacion_exitosa",
        "error_desconocido",
        "validacion_fallida",
        "recurso_no_encontrado",
        "permiso_denegado",
    }
    defined_keys.update(fallback_keys)

    if not defined_keys:
        print("[WARN] No se encontraron definiciones de llaves (constants.py).")

    print(f"[INFO] Keys conocidas: {len(defined_keys)}")

    usage_pattern = re.compile(r'message_key=[\'"]([a-z0-9_]+)[\'"]')
    violations = []

    for root, _dirs, files in os.walk(backend_root):
        if "migrations" in root or "tests" in root:
            continue

        for file in files:
            if not (file.endswith("_views.py") or file.endswith("views.py")):
                continue

            full_path = os.path.join(root, file)
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
            except Exception:
                continue

            for i, line in enumerate(lines, start=1):
                matches = usage_pattern.findall(line)
                for used_key in matches:
                    if used_key not in defined_keys:
                        violations.append(
                            {
                                "file": full_path,
                                "line": i,
                                "key": used_key,
                            }
                        )

    if violations:
        print("\n[FAIL] Violaciones de Canon: message_keys no definidos en constants:")
        for violation in violations:
            print(f"   [KEY] '{violation['key']}' en {violation['file']}:{violation['line']}")
        print("\nAccion requerida: definir la key en constants.py o corregir el typo.")
        sys.exit(1)

    print("[OK] Message Key Check Passed: Todas las keys usadas estan definidas.")


if __name__ == "__main__":
    target_dir = "backend" if os.path.isdir("backend") else "."
    check_message_keys(target_dir)
