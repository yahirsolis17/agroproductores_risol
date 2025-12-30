"""
Heurística de auditoría para contratos de listados:
- Detecta views con def list() que no mencionan meta/results ni notify_list.
- Apunta a prevenir listados sin results/meta (canon).
"""
from pathlib import Path
import sys

ROOT = Path(__file__).parent
TARGETS = [
    ROOT / "backend" / "gestion_bodega" / "views",
    ROOT / "backend" / "gestion_huerta" / "views",
    ROOT / "backend" / "gestion_usuarios" / "views",
]
EXCLUDES = {"reportes", "migrations", "__pycache__", "test", "tests"}


def should_skip(path: Path) -> bool:
    for part in path.parts:
        if part in EXCLUDES:
            return True
    return False


def main() -> int:
    violations: list[Path] = []

    for base in TARGETS:
        if not base.exists():
            continue
        for path in base.rglob("*.py"):
            if should_skip(path):
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except Exception as exc:
                print(f"Advertencia: no se pudo leer {path}: {exc}")
                continue

            if "def list" not in text:
                continue

            has_meta = "meta" in text
            has_results = "results" in text
            has_notify_list = "notify_list" in text
            has_paginated = "get_paginated_response" in text

            if not (has_meta and has_results) and not has_notify_list and not has_paginated:
                violations.append(path)

    if violations:
        print("ERROR: Listados potencialmente sin results/meta:")
        for v in violations:
            print(f" - {v}")
        print("Acción: asegurar data.results + data.meta (o NotificationMixin.notify_list).")
        return 1

    print("OK: Listados con señales de results/meta o notify_list detectadas.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
