"""
Guardrail dual:
- Bloquea uso de toast.* fuera de NotificationEngine.ts
- Bloquea uso directo de axios fuera de global/api/apiClient.ts
"""
from pathlib import Path
import sys

ROOT = Path(__file__).parent
SRC = ROOT / "frontend" / "src"
TOAST_ALLOW = {
    SRC / "global" / "utils" / "NotificationEngine.ts",
}
AXIOS_ALLOW = {
    SRC / "global" / "api" / "apiClient.ts",
}


def main() -> int:
    if not SRC.exists():
        print("frontend/src no existe; se omite chequeo.")
        return 0

    toast_violations: list[Path] = []
    axios_violations: list[Path] = []

    for path in SRC.rglob("*"):
        if path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue

        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception as exc:  # pragma: no cover
            print(f"Advertencia: no se pudo leer {path}: {exc}")
            continue

        # toast.* uso
        if "toast." in text and path not in TOAST_ALLOW:
            toast_violations.append(path)

        # axios import/uso
        axios_hit = "axios" in text
        if axios_hit and path not in AXIOS_ALLOW:
            axios_violations.append(path)

    failed = False
    if toast_violations:
        failed = True
        print("ERROR: uso de toast.* fuera de NotificationEngine.ts")
        for v in toast_violations:
            print(f" - {v}")

    if axios_violations:
        failed = True
        print("ERROR: uso de axios fuera de apiClient.ts")
        for v in axios_violations:
            print(f" - {v}")

    if failed:
        print("Acción: canalizar toasts vía NotificationEngine y HTTP vía apiClient.")
        return 1

    print("OK: toast y axios solo en archivos permitidos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
