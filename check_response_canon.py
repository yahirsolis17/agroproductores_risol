import os
import re
import sys


def check_response_usage(backend_root):
    """
    Escanea views de Django buscando uso directo de Response() o HttpResponse()
    fuera de las excepciones permitidas (reportes, utils).
    """
    print(f"[AUDIT] Auditando uso de Response raw en: {backend_root}")

    forbidden_patterns = [
        re.compile(r"return\s+Response\s*\("),
        re.compile(r"return\s+HttpResponse\s*\("),
        re.compile(r"return\s+JsonResponse\s*\("),
    ]

    excludes = [
        r"reportes",
        r"utils",
        r"migrations",
        r"tests",
        r"venv",
        r"__pycache__",
        r"manage.py",
    ]

    violations = []

    for root, dirs, files in os.walk(backend_root):
        dirs[:] = [d for d in dirs if not any(exc in os.path.join(root, d) for exc in excludes)]

        for file in files:
            if not file.endswith(".py"):
                continue

            full_path = os.path.join(root, file)
            if any(exc in full_path for exc in excludes):
                continue

            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
            except Exception as exc:
                print(f"[WARN] Error leyendo {full_path}: {exc}")
                continue

            for i, line in enumerate(lines, start=1):
                if line.strip().startswith("#"):
                    continue
                for pattern in forbidden_patterns:
                    if pattern.search(line):
                        violations.append(
                            {
                                "file": full_path,
                                "line": i,
                                "content": line.strip(),
                            }
                        )

    if violations:
        print("\n[FAIL] Violaciones al Canon detectadas (Response crudo en endpoints JSON):")
        for violation in violations:
            print(f"   [FILE] {violation['file']}:{violation['line']}")
            print(f"      Code: {violation['content']}")
        print(
            "\nFix: Use NotificationHandler.generate_response(...) "
            "o mueva el archivo a una carpeta de excepciones valida."
        )
        sys.exit(1)

    print("[OK] Canon Check Passed: No se detectaron Responses crudos ilegales.")
    sys.exit(0)


if __name__ == "__main__":
    target_dir = "backend" if os.path.isdir("backend") else "."
    check_response_usage(target_dir)
