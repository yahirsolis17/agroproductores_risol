#!/usr/bin/env python
"""Manual smoke for bodega tablero endpoints using deterministic seeded data."""
from __future__ import annotations

import os
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "agroproductores_risol.settings")

from smoke_utils import ensure_smoke_context  # noqa: E402


def get_boxes(item: dict) -> object:
    return item.get("cajas", item.get("kg"))


def main() -> int:
    context = ensure_smoke_context()

    from gestion_usuarios.models import Users  # noqa: WPS433
    from rest_framework.test import APIClient  # noqa: WPS433

    user = Users.objects.get(pk=context.user_id)

    client = APIClient(HTTP_HOST="127.0.0.1")
    client.force_authenticate(user=user)
    base = {"temporada": context.temporada_id, "bodega": context.bodega_id}

    checks = [
        ("summary", "/bodega/tablero/summary/", base),
        ("queues_recepciones", "/bodega/tablero/queues/", {**base, "queue": "recepciones"}),
        ("queues_inventarios", "/bodega/tablero/queues/", {**base, "queue": "inventarios"}),
        ("queues_despachos", "/bodega/tablero/queues/", {**base, "queue": "despachos"}),
        ("queues_borrador", "/bodega/tablero/queues/", {**base, "queue": "despachos", "estado": "BORRADOR"}),
        ("queues_confirmado", "/bodega/tablero/queues/", {**base, "queue": "despachos", "estado": "CONFIRMADO"}),
    ]

    print("=" * 60)
    print("SMOKE TABLERO BODEGA")
    print("=" * 60)
    print(context.to_json())

    failures = 0
    for name, url, params in checks:
        response = client.get(url, params)
        print(f"\n{name}: status={response.status_code}")
        if response.status_code != 200:
            print(response.content[:400])
            failures += 1
            continue

        payload = response.json().get("data", {})
        if name == "summary":
            print(f"kpis={list(payload.get('kpis', {}).keys())}")
        else:
            results = payload.get("results", [])
            print(f"items={len(results)}")
            if results:
                print(f"sample={results[0].get('ref')} cajas={get_boxes(results[0])}")

    print("\nRESULTADO:", "OK" if failures == 0 else f"FAIL ({failures})")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
