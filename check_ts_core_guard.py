"""
Guardrail para capas core:
- Falla si hay @ts-ignore en src/global/**
- Falla si se usa 'any' en src/global/api/** o src/global/store/**
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).parent
SRC = ROOT / "frontend" / "src"

IGNORE_ZONE = SRC / "global"
ANY_ZONES = [
    SRC / "global" / "api",
    SRC / "global" / "store",
]


def scan_ts_ignore() -> list[Path]:
    hits: list[Path] = []
    if not IGNORE_ZONE.exists():
        return hits
    for path in IGNORE_ZONE.rglob("*"):
        if path.suffix not in {".ts", ".tsx"}:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if "@ts-ignore" in text:
            hits.append(path)
    return hits


def scan_any_usage() -> list[tuple[Path, int, str]]:
    hits: list[tuple[Path, int, str]] = []
    for zone in ANY_ZONES:
        if not zone.exists():
            continue
        for path in zone.rglob("*"):
            if path.suffix not in {".ts", ".tsx"}:
                continue
            try:
                lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
            except Exception:
                continue
            for i, line in enumerate(lines, start=1):
                if re.search(r"\bany\b", line):
                    hits.append((path, i, line.strip()))
    return hits


def main() -> int:
    ts_ignore_hits = scan_ts_ignore()
    any_hits = scan_any_usage()

    failed = False
    if ts_ignore_hits:
        failed = True
        print("ERROR: se encontró @ts-ignore en src/global/**")
        for p in ts_ignore_hits:
            print(f" - {p}")

    if any_hits:
        failed = True
        print("ERROR: se encontró 'any' en zonas core (api/store):")
        for path, line, content in any_hits:
            print(f" - {path}:{line}: {content}")

    if failed:
        print("Acción: elimina @ts-ignore y 'any' en core, usa tipos explícitos o @ts-expect-error con justificación.")
        return 1

    print("OK: sin @ts-ignore y sin 'any' en core.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
