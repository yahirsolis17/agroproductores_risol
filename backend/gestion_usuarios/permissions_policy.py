"""
Policy-driven capability map per model.

Capabilities:
- crud       -> add_, change_, delete_, view_
- archive    -> archive_, restore_
- lifecycle  -> finalize_, reactivate_
- export     -> exportpdf_, exportexcel_

Keys are tuples (app_label, model_name) where model_name is Django's
_meta.model_name (lowercase, singular; e.g., 'huertarentada').
"""

from __future__ import annotations

from typing import Dict, Iterable, Set, Tuple


Capability = str
ModelKey = Tuple[str, str]


MODEL_CAPABILITIES: Dict[ModelKey, Set[Capability]] = {
    # gestion_huerta (conservadora)
    ("gestion_huerta", "huerta"): {"crud", "archive"},
    ("gestion_huerta", "huertarentada"): {"crud", "archive"},
    ("gestion_huerta", "temporada"): {"crud", "archive", "lifecycle", "export"},
    ("gestion_huerta", "cosecha"): {"crud", "archive", "lifecycle", "export"},
    ("gestion_huerta", "propietario"): {"crud", "archive"},
    ("gestion_huerta", "categoriainversion"): {"crud", "archive"},
    ("gestion_huerta", "inversioneshuerta"): {"crud", "archive"},
    ("gestion_huerta", "venta"): {"crud", "archive"},

    # gestion_bodega (por decidir lifecycle/export en varias)
    ("gestion_bodega", "bodega"): {"crud", "archive"},
    ("gestion_bodega", "temporadabodega"): {"crud", "archive", "lifecycle"},
    ("gestion_bodega", "cliente"): {"crud", "archive"},
    ("gestion_bodega", "recepcion"): {"crud", "archive"},
    ("gestion_bodega", "clasificacionempaque"): {"crud", "export"},
    ("gestion_bodega", "inventarioplastico"): {"crud", "archive"},
    ("gestion_bodega", "movimientoplastico"): {"crud"},
    ("gestion_bodega", "pedido"): {"crud", "archive"},
    ("gestion_bodega", "pedidorenglon"): {"crud"},
    ("gestion_bodega", "surtidorenglon"): {"crud"},
    ("gestion_bodega", "camionsalida"): {"crud", "archive"},
    ("gestion_bodega", "camionitem"): {"crud"},
    ("gestion_bodega", "compramadera"): {"crud", "archive"},
    ("gestion_bodega", "abonomadera"): {"crud", "archive"},
    ("gestion_bodega", "consumible"): {"crud", "archive"},
    ("gestion_bodega", "cierresemanal"): {"crud", "export"},

    # gestion_usuarios (no exponer en UI de asignación; policy sin export)
    ("gestion_usuarios", "users"): {"crud"},
    ("gestion_usuarios", "registroactividad"): {"crud"},
}


CAPABILITY_PREFIXES: Dict[Capability, Tuple[str, ...]] = {
    "crud": ("add_", "change_", "delete_", "view_"),
    "archive": ("archive_", "restore_"),
    "lifecycle": ("finalize_", "reactivate_"),
    "export": ("exportpdf_", "exportexcel_"),
}


def allowed_prefixes_for(model_key: ModelKey) -> Set[str]:
    caps = MODEL_CAPABILITIES.get(model_key, set())
    prefixes: Set[str] = set()
    for cap in caps:
        prefixes.update(CAPABILITY_PREFIXES.get(cap, ()))
    return prefixes


def is_codename_allowed(app_label: str, model: str, codename: str) -> bool:
    """True si el codename respeta la policy para ese (app, model)."""
    prefixes = allowed_prefixes_for((app_label, model))
    return any(codename.startswith(p) for p in prefixes)
