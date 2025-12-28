"""
Detecta HTTP fuera del cliente canónico:
- Falla si hay import/uso de fetch explícito a URLs absolutas en frontend/src
- Falla si hay import directo de axios fuera de apiClient
Objetivo: que todo tráfico HTTP pase por apiClient y su manejo de tokens.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).parent
SRC = ROOT / "frontend" / "src"
AXIOS_ALLOW = {
    SRC / "global" / "api" / "apiClient.ts",
}


FETCH_URL_PATTERN = re.compile(r"fetch\s*\(\s*['\"]https?://", re.IGNORECASE)


def main() -> int:
    if not SRC.exists():
        print("frontend/src no existe; se omite chequeo.")
        return 0

    axios_hits: list[Path] = []
    fetch_hits: list[tuple[Path, int, str]] = []

    for path in SRC.rglob("*"):
        if path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        try:
            lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        except Exception as exc:  # pragma: no cover
            print(f"Advertencia: no se pudo leer {path}: {exc}")
            continue

        if "axios" in "\n".join(lines) and path not in AXIOS_ALLOW:
            axios_hits.append(path)

        for i, line in enumerate(lines, start=1):
            if FETCH_URL_PATTERN.search(line):
                fetch_hits.append((path, i, line.strip()))

    failed = False
    if axios_hits:
        failed = True
        print("ERROR: import/uso de axios fuera de apiClient:")
        for p in axios_hits:
            print(f" - {p}")

    if fetch_hits:
        failed = True
        print("ERROR: uso de fetch() con URL absoluta (debería pasar por apiClient):")
        for path, line, content in fetch_hits:
            print(f" - {path}:{line}: {content}")

    if failed:
        print("Acción: centralizar llamadas HTTP en apiClient.")
        return 1

    print("OK: sin axios fuera de apiClient ni fetch con URLs absolutas.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
