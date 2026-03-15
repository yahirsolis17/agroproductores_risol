import json
from datetime import date

from smoke_utils import ensure_smoke_context


def json_serial(obj):
    if isinstance(obj, date):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def main() -> int:
    context = ensure_smoke_context()

    from gestion_bodega.utils.kpis import build_queue_items, queue_despachos_qs, queue_inventarios_qs

    print("--- CONTEXTO SMOKE ---")
    print(context.to_json())

    print("\n--- INVENTARIOS ---")
    inv_rows = queue_inventarios_qs(
        temporada_id=context.temporada_id,
        bodega_id=context.bodega_id,
        semana_id=context.semana_id,
    )
    inv_items = build_queue_items("inventarios", inv_rows)
    print(f"items={len(inv_items)}")
    if inv_items:
        print(json.dumps(inv_items[0], default=json_serial, indent=2))

    print("\n--- DESPACHOS BORRADOR ---")
    borrador_rows = queue_despachos_qs(
        temporada_id=context.temporada_id,
        bodega_id=context.bodega_id,
        estado="BORRADOR",
    )
    borrador_items = build_queue_items("despachos", borrador_rows)
    print(f"items={len(borrador_items)}")
    if borrador_items:
        print(json.dumps(borrador_items[0], default=json_serial, indent=2))

    print("\n--- DESPACHOS CONFIRMADO ---")
    confirmado_rows = queue_despachos_qs(
        temporada_id=context.temporada_id,
        bodega_id=context.bodega_id,
        estado="CONFIRMADO",
    )
    confirmado_items = build_queue_items("despachos", confirmado_rows)
    print(f"items={len(confirmado_items)}")
    if confirmado_items:
        print(json.dumps(confirmado_items[0], default=json_serial, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
