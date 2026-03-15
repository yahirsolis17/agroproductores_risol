from __future__ import annotations

import os
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "agroproductores_risol.settings")

from smoke_utils import BACKEND_DIR as SMOKE_BACKEND_DIR  # noqa: E402
from smoke_utils import ensure_smoke_context  # noqa: E402


def main() -> int:
    context = ensure_smoke_context()

    from gestion_bodega.services.reportes.semanal_service import (  # noqa: WPS433
        build_reporte_semanal_json,
        build_reporte_semanal_pdf,
    )
    from gestion_bodega.services.reportes.temporada_service import (  # noqa: WPS433
        build_reporte_temporada_json,
        build_reporte_temporada_pdf,
    )

    print("--- CONTEXTO SMOKE ---")
    print(context.to_json())

    print("\n--- JSON SEMANAL ---")
    semanal = build_reporte_semanal_json(
        context.bodega_id,
        context.temporada_id,
        context.semana_iso,
    )
    print(f"kpis={len(semanal.get('kpis', []))}")
    print(f"tablas={list(semanal.get('tablas', {}).keys())}")

    print("\n--- PDF SEMANAL ---")
    pdf_semana, _filename_semana = build_reporte_semanal_pdf(
        context.bodega_id,
        context.temporada_id,
        context.semana_iso,
    )
    semanal_path = SMOKE_BACKEND_DIR / "smoke_reporte_bodega_semanal.pdf"
    semanal_path.write_bytes(pdf_semana)
    print(f"path={semanal_path}")
    print(f"bytes={len(pdf_semana)}")

    print("\n--- JSON TEMPORADA ---")
    temporada = build_reporte_temporada_json(
        context.bodega_id,
        context.temporada_id,
    )
    print(f"kpis={len(temporada.get('kpis', []))}")
    print(f"tablas={list(temporada.get('tablas', {}).keys())}")

    print("\n--- PDF TEMPORADA ---")
    pdf_temporada, _filename_temporada = build_reporte_temporada_pdf(
        context.bodega_id,
        context.temporada_id,
    )
    temporada_path = SMOKE_BACKEND_DIR / "smoke_reporte_bodega_temporada.pdf"
    temporada_path.write_bytes(pdf_temporada)
    print(f"path={temporada_path}")
    print(f"bytes={len(pdf_temporada)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
