"""
Verifica que exista una sola "fuente de la verdad" en docs.
Falla si hay más de un archivo que coincide con el patrón fuente_de_la_verdad*.md.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).parent
DOCS = ROOT / "docs"


def main() -> int:
    if not DOCS.exists():
        print("docs/ no existe; se omite chequeo.")
        return 0

    matches = sorted(DOCS.glob("fuente_de_la_verdad*.md"))

    if len(matches) == 1:
        print(f"OK: única fuente de la verdad: {matches[0].name}")
        return 0

    if len(matches) == 0:
        print("ERROR: no se encontró fuente_de_la_verdad*.md en docs/")
        return 1

    print("ERROR: múltiples archivos fuente_de_la_verdad*.md en docs/:")
    for path in matches:
        print(f" - {path.name}")
    print("Acción: dejar solo un archivo canónico o mover los demás a archivado/.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
