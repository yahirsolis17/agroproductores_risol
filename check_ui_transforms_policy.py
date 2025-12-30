"""
Valida la política de transformaciones UI-only en frontend.
- Permite transformaciones en componentes UI y utilidades aprobadas.
- Bloquea transformaciones en services y pages.
- En store permite solo si el archivo declara STATE-UPDATE.
- Para el resto exige comentario "UI-ONLY" cerca del match.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).parent
SRC = ROOT / "frontend" / "src"

PATTERN = re.compile(r"\.filter\(|\.sort\(|\.slice\(")

WHITELIST_DIRS = {
    "components",  # UI-only components
}
WHITELIST_FILES = {
    SRC / "global" / "utils" / "uiTransforms.ts",
    SRC / "modules" / "gestion_huerta" / "utils" / "reportesAdapters.ts",
}

STATE_UPDATE_MARKER = "STATE-UPDATE"
UI_ONLY_MARKER = "UI-ONLY"


def is_whitelisted(path: Path) -> bool:
    if path in WHITELIST_FILES:
        return True
    # allow any file under frontend/src/components
    parts = path.parts
    try:
        idx = parts.index("src")
        rel = parts[idx + 1:]
    except ValueError:
        return False
    return rel and rel[0] in WHITELIST_DIRS


def main() -> int:
    if not SRC.exists():
        print("frontend/src no existe; se omite chequeo.")
        return 0

    violations: list[str] = []

    for path in SRC.rglob("*.ts"):
        if path.suffix not in {".ts", ".tsx"}:
            continue
        try:
            lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        except Exception as exc:
            print(f"Advertencia: no se pudo leer {path}: {exc}")
            continue

        if not any(PATTERN.search(line) for line in lines):
            continue

        rel = path.relative_to(SRC)

        # Hard bans
        if "services" in rel.parts or "pages" in rel.parts:
            for i, line in enumerate(lines, start=1):
                if PATTERN.search(line):
                    violations.append(f"{rel}:{i}: {line.strip()} (prohibido en services/pages)")
            continue

        # Allowlist
        if is_whitelisted(path):
            continue

        # Store reducers: allow only if marker present
        if "global" in rel.parts and "store" in rel.parts:
            if STATE_UPDATE_MARKER not in "\n".join(lines):
                for i, line in enumerate(lines, start=1):
                    if PATTERN.search(line):
                        violations.append(f"{rel}:{i}: {line.strip()} (falta STATE-UPDATE)")
            continue

        # Require UI-ONLY marker near match
        for i, line in enumerate(lines, start=1):
            if not PATTERN.search(line):
                continue
            window = "\n".join(lines[max(0, i - 3): i + 2])
            if UI_ONLY_MARKER not in window:
                violations.append(f"{rel}:{i}: {line.strip()} (falta UI-ONLY)")

    if violations:
        print("ERROR: Transformaciones fuera de política UI-only:")
        for v in violations:
            print(f" - {v}")
        return 1

    print("OK: Transformaciones UI-only cumplen política.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
