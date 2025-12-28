"""
Faila si se detecta uso de React Query (react-query o @tanstack/react-query) en el frontend.
Pensado como guardrail para mantener un solo motor de estado/cache.
"""

from pathlib import Path
import sys

ROOT = Path(__file__).parent
SRC = ROOT / "frontend" / "src"


def main() -> int:
    if not SRC.exists():
        print("frontend/src no existe; se omite chequeo.")
        return 0

    violations: list[Path] = []
    for path in SRC.rglob("*"):
        if path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception as exc:  # pragma: no cover
            print(f"Advertencia: no se pudo leer {path}: {exc}")
            continue

        if "react-query" in text or "@tanstack/react-query" in text:
            violations.append(path)

    if violations:
        print("ERROR: Se encontró uso de React Query (react-query o @tanstack/react-query).")
        for v in violations:
            print(f" - {v}")
        print("Acción: eliminar dependencias y migrar al flujo canónico (Redux + apiClient).")
        return 1

    print("OK: No se encontró React Query en frontend/src.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
