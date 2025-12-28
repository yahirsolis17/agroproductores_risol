"""
Valida usos de TableLayout con paginación server-side para asegurar que se pase metaPageSize
en conjunto con pageSize, evitando hardcodes de 10.
Heurístico: si un archivo contiene "TableLayout" y "serverSidePagination", debe mencionar "metaPageSize".
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

        if "TableLayout" in text and "serverSidePagination" in text:
            if "metaPageSize" not in text:
                violations.append(path)

    if violations:
        print("ERROR: Usos de TableLayout con serverSidePagination sin metaPageSize:")
        for v in violations:
            print(f" - {v}")
        print("Acción: pasar meta.page_size (metaPageSize) junto con pageSize.")
        return 1

    print("OK: Todos los TableLayout con paginación server-side declaran metaPageSize.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
