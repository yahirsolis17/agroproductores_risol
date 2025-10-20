# backend/gestion_bodega/utils/kpis.py
from __future__ import annotations
import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.db.models import Sum, Avg, F, Q, Count, FloatField, ExpressionWrapper
from django.utils import timezone

# Umbrales: si luego los mueves a DB, importa desde un service
OCUPACION_WARNING = 0.85
OCUPACION_CRITICAL = 0.95
RECHAZOS_QC_UMBRAL = 0.08
VENTANA_MADUREZ_HORAS = 48
FEFO_MIN_COMPLIANCE = 0.90

logger = logging.getLogger(__name__)

try:
    from gestion_bodega.models import (
        Recepcion,
        Lote,
        Camara,
        Despacho,
        DespachoItem,
        InspeccionCalidad,
    )
except Exception as e:
    logger.warning("Modelos de gestion_bodega no disponibles aún: %s", e)
    Recepcion = Lote = Camara = Despacho = DespachoItem = InspeccionCalidad = None

def _range_filter(qs, desde: Optional[str], hasta: Optional[str], field: str):
    if desde:
        qs = qs.filter(**{f"{field}__date__gte": desde})
    if hasta:
        qs = qs.filter(**{f"{field}__date__lte": hasta})
    return qs

def kpi_recepcion(temporada_id: int, fecha_desde: Optional[str], fecha_hasta: Optional[str], huerta_id: Optional[int]) -> Dict[str, Any]:
    if not Recepcion:
        return {"kg_total": 0, "kg_apto": 0, "kg_merma": 0, "apto_pct": 0, "merma_pct": 0, "hoy": 0, "semana": 0}
    qs = Recepcion.objects.filter(temporada_id=temporada_id)
    if huerta_id:
        qs = qs.filter(huerta_id=huerta_id)
    qs = _range_filter(qs, fecha_desde, fecha_hasta, "fecha_recepcion")

    agg = qs.aggregate(
        kg_total=Sum(F("kg_bruto")),
        kg_apto=Sum(F("kg_apto")),
        kg_merma=Sum(F("kg_merma")),
    )
    kg_total = float(agg.get("kg_total") or 0.0)
    kg_apto = float(agg.get("kg_apto") or 0.0)
    kg_merma = float(agg.get("kg_merma") or 0.0)

    today = timezone.localdate()
    start_week = today - timedelta(days=today.weekday())
    hoy = qs.filter(fecha_recepcion__date=today).aggregate(v=Sum("kg_bruto"))["v"] or 0
    semana = qs.filter(fecha_recepcion__date__gte=start_week).aggregate(v=Sum("kg_bruto"))["v"] or 0

    return {
        "kg_total": kg_total,
        "kg_apto": kg_apto,
        "kg_merma": kg_merma,
        "apto_pct": round((kg_apto / kg_total), 4) if kg_total else 0.0,
        "merma_pct": round((kg_merma / kg_total), 4) if kg_total else 0.0,
        "hoy": float(hoy or 0.0),
        "semana": float(semana or 0.0),
    }

def kpi_stock(temporada_id: int, huerta_id: Optional[int]) -> Dict[str, Any]:
    if not Lote:
        return {"total_kg": 0, "por_madurez": {}, "por_calidad": {}}
    qs = Lote.objects.filter(temporada_id=temporada_id).exclude(estado__in=["despachado", "cerrado"])
    if huerta_id:
        qs = qs.filter(recepcion__huerta_id=huerta_id)
    total_kg = qs.aggregate(v=Sum(F("kg_apto")))["v"] or 0
    por_madurez = qs.values("grado_madurez").annotate(kg=Sum("kg_apto"))
    por_calidad = qs.values("calidad").annotate(kg=Sum("kg_apto"))
    return {
        "total_kg": float(total_kg),
        "por_madurez": {i["grado_madurez"]: float(i["kg"] or 0) for i in por_madurez},
        "por_calidad": {i["calidad"]: float(i["kg"] or 0) for i in por_calidad},
    }

def kpi_ocupacion(temporada_id: int) -> Dict[str, Any]:
    if not (Lote and Camara):
        return {"total_pct": 0.0, "por_camara": []}
    por_camara, total_cap, total_used = [], 0.0, 0.0
    for c in Camara.objects.all().values("id", "nombre", "capacidad_kg"):
        cap = float(c.get("capacidad_kg") or 0.0)
        used = float(
            Lote.objects.filter(temporada_id=temporada_id, ubicacion_actual__camara_id=c["id"])
            .exclude(estado__in=["despachado", "cerrado"])
            .aggregate(v=Sum("kg_apto"))["v"] or 0.0
        )
        pct = round(used / cap, 4) if cap else 0.0
        por_camara.append({"camara": c["nombre"], "capacidad_kg": cap, "ocupado_kg": used, "pct": pct})
        total_cap += cap
        total_used += used
    total_pct = round(total_used / total_cap, 4) if total_cap else 0.0
    return {"total_pct": total_pct, "por_camara": por_camara}

def kpi_rotacion(temporada_id: int) -> Dict[str, Any]:
    if not Lote:
        return {"dias_promedio_bodega": 0.0}
    qs = Lote.objects.filter(temporada_id=temporada_id).exclude(estado__in=["despachado", "cerrado"])
    now = timezone.now()
    qs = qs.annotate(dias=ExpressionWrapper((now - F("fecha_ingreso_bodega")) / timedelta(days=1), output_field=FloatField()))
    total_kg = qs.aggregate(v=Sum("kg_apto"))["v"] or 0.0
    rot_pond = qs.aggregate(v=Sum(F("dias") * F("kg_apto")))["v"] or 0.0
    dias_prom = float(rot_pond / total_kg) if total_kg else 0.0
    return {"dias_promedio_bodega": round(dias_prom, 2)}

def kpi_fefo(temporada_id: int) -> Dict[str, Any]:
    if not DespachoItem:
        return {"compliance_pct": None}
    qs = DespachoItem.objects.filter(despacho__temporada_id=temporada_id)
    total = qs.count()
    if total == 0:
        return {"compliance_pct": None}
    ok = qs.filter(fefo_ok=True).count()
    return {"compliance_pct": round(ok / total, 4)}

def kpi_rechazos_qc(temporada_id: int) -> Dict[str, Any]:
    if not Recepcion:
        return {"tasa_pct": 0.0, "top_causas": []}
    qs = Recepcion.objects.filter(temporada_id=temporada_id)
    agg = qs.aggregate(total=Sum("kg_bruto"), merma=Sum("kg_merma"))
    total, merma = float(agg["total"] or 0.0), float(agg["merma"] or 0.0)
    tasa = round(merma / total, 4) if total else 0.0

    top_causas = []
    if InspeccionCalidad:
        causas = (
            InspeccionCalidad.objects.filter(recepcion__temporada_id=temporada_id)
            .values("causa")
            .annotate(c=Count("id"))
            .order_by("-c")[:5]
        )
        total_causas = sum([c["c"] for c in causas]) or 1
        top_causas = [{"causa": c["causa"], "pct": round(c["c"] / total_causas, 4)} for c in causas]

    return {"tasa_pct": tasa, "top_causas": top_causas}

def kpi_lead_times(temporada_id: int) -> Dict[str, Any]:
    out = {"recepcion_a_ubicacion_h": None, "ubicacion_a_despacho_h": None}
    if not (Lote):
        return out
    qs = Lote.objects.filter(temporada_id=temporada_id, fecha_ingreso_bodega__isnull=False, recepcion__fecha_recepcion__isnull=False)
    if qs.exists():
        avg_hours = qs.annotate(
            delta_h=ExpressionWrapper((F("fecha_ingreso_bodega") - F("recepcion__fecha_recepcion")) / timedelta(hours=1), output_field=FloatField())
        ).aggregate(v=Avg("delta_h"))["v"]
        out["recepcion_a_ubicacion_h"] = round(float(avg_hours), 2) if avg_hours is not None else None

    if DespachoItem:
        di = DespachoItem.objects.filter(
            lote__temporada_id=temporada_id,
            despacho__fecha_completado__isnull=False,
            lote__fecha_ingreso_bodega__isnull=False,
        )
        if di.exists():
            avg2 = di.annotate(
                delta_h=ExpressionWrapper((F("despacho__fecha_completado") - F("lote__fecha_ingreso_bodega")) / timedelta(hours=1), output_field=FloatField())
            ).aggregate(v=Avg("delta_h"))["v"]
            out["ubicacion_a_despacho_h"] = round(float(avg2), 2) if avg2 is not None else None
    return out

def build_summary(temporada_id: int, fecha_desde: Optional[str], fecha_hasta: Optional[str], huerta_id: Optional[int]) -> Dict[str, Any]:
    return {
        "kpis": {
            "recepcion": kpi_recepcion(temporada_id, fecha_desde, fecha_hasta, huerta_id),
            "stock": kpi_stock(temporada_id, huerta_id),
            "ocupacion": kpi_ocupacion(temporada_id),
            "rotacion": kpi_rotacion(temporada_id),
            "fefo": kpi_fefo(temporada_id),
            "rechazos_qc": kpi_rechazos_qc(temporada_id),
            "lead_times": kpi_lead_times(temporada_id),
        }
    }

def queue_recepciones_qs(temporada_id: int):
    if not Recepcion:
        return []
    return (
        Recepcion.objects.filter(temporada_id=temporada_id, estado="pendiente_qc")
        .values("id", "fecha_recepcion", "huerta__nombre", "kg_bruto")
        .order_by("fecha_recepcion", "id")
    )

def queue_ubicaciones_qs(temporada_id: int):
    if not Lote:
        return []
    return (
        Lote.objects.filter(temporada_id=temporada_id)
        .filter(Q(estado__in=["apto", "recibido"]) & (Q(ubicacion_actual__isnull=True) | Q(estado="por_reubicar")))
        .values(
            "id",
            "recepcion__fecha_recepcion",
            "recepcion__huerta__nombre",
            "kg_apto",
            "grado_madurez",
            "calidad",
            "ubicacion_actual__camara__nombre",
        )
        .order_by("-grado_madurez", "-recepcion__fecha_recepcion")
    )

def queue_despachos_qs(temporada_id: int):
    if not Despacho:
        return []
    return (
        Despacho.objects.filter(temporada_id=temporada_id, estado__in=["planificado", "picking"])
        .values("id", "fecha_programada")
        .annotate(kg=Sum("despachoitem__kg"))
        .order_by("fecha_programada", "id")
    )

def build_queue_items(tipo: str, raw_rows) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    if tipo == "recepciones":
        for r in raw_rows:
            items.append({
                "id": r["id"],
                "ref": f"REC-{r['id']}",
                "fecha": r["fecha_recepcion"],
                "huerta": r.get("huerta__nombre"),
                "kg": float(r.get("kg_bruto") or 0.0),
                "estado": "pendiente_qc",
                "meta": {},
            })
    elif tipo == "ubicaciones":
        for r in raw_rows:
            items.append({
                "id": r["id"],
                "ref": f"LOT-{r['id']}",
                "fecha": r["recepcion__fecha_recepcion"],
                "huerta": r.get("recepcion__huerta__nombre"),
                "kg": float(r.get("kg_apto") or 0.0),
                "estado": "sin_ubicacion" if not r.get("ubicacion_actual__camara__nombre") else "por_reubicar",
                "meta": {
                    "madurez": r.get("grado_madurez"),
                    "calidad": r.get("calidad"),
                    "camara": r.get("ubicacion_actual__camara__nombre"),
                },
            })
    elif tipo == "despachos":
        for r in raw_rows:
            items.append({
                "id": r["id"],
                "ref": f"DES-{r['id']}",
                "fecha": r["fecha_programada"],
                "huerta": None,
                "kg": float(r.get("kg") or 0.0),
                "estado": "picking_pendiente",
                "meta": {"sla_h": None},
            })
    return items

def build_alerts(temporada_id: int) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = []

    oc = kpi_ocupacion(temporada_id)
    for c in oc.get("por_camara", []):
        pct = c["pct"]
        if pct >= OCUPACION_CRITICAL:
            alerts.append({
                "code": "OCUPACION_CRITICA",
                "title": f"Cámara {c['camara']} al {int(pct*100)}%",
                "description": "Capacidad crítica; evita nuevas ubicaciones y considera reubicar.",
                "severity": "critical",
                "link": {"path": "/bodega/ubicaciones", "query": {"temporada": temporada_id, "camara": c["camara"]}},
            })
        elif pct >= OCUPACION_WARNING:
            alerts.append({
                "code": "OCUPACION_ALTA",
                "title": f"Cámara {c['camara']} al {int(pct*100)}%",
                "description": "Capacidad alta; monitorea pickings y reubicaciones.",
                "severity": "warning",
                "link": {"path": "/bodega/ubicaciones", "query": {"temporada": temporada_id, "camara": c["camara"]}},
            })

    rech = kpi_rechazos_qc(temporada_id).get("tasa_pct") or 0.0
    if rech >= RECHAZOS_QC_UMBRAL:
        alerts.append({
            "code": "RECHAZOS_QC_ALTOS",
            "title": "Tasa de rechazos QC elevada",
            "description": f"La tasa actual ({int(rech*100)}%) supera el umbral.",
            "severity": "warning",
            "link": {"path": "/bodega/calidad", "query": {"temporada": temporada_id}},
        })

    fefo = kpi_fefo(temporada_id).get("compliance_pct")
    if fefo is not None and fefo < FEFO_MIN_COMPLIANCE:
        alerts.append({
            "code": "FEFO_BAJO",
            "title": "Cumplimiento FEFO insuficiente",
            "description": f"Cumplimiento {int(fefo*100)}% por debajo de lo esperado.",
            "severity": "warning",
            "link": {"path": "/bodega/despachos", "query": {"temporada": temporada_id}},
        })

    if Lote:
        limite = timezone.now() + timedelta(hours=VENTANA_MADUREZ_HORAS)
        proximos = Lote.objects.filter(temporada_id=temporada_id, estado__in=["apto", "en_ubicacion"]).filter(
            Q(fecha_ventana_madurez__lte=limite) | Q(grado_madurez="maduro")
        ).count()
        if proximos:
            alerts.append({
                "code": "MADUREZ_PROXIMA",
                "title": "Lotes entrando a ventana de madurez",
                "description": f"{proximos} lote(s) requieren despacho prioritario en {VENTANA_MADUREZ_HORAS}h.",
                "severity": "info",
                "link": {"path": "/bodega/lotes", "query": {"temporada": temporada_id, "prioridad": "madurez"}},
            })
    return alerts
