from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any
from urllib.parse import urlencode

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from gestion_bodega.models import (
    Bodega,
    CamionSalida,
    CierreSemanal,
    ClasificacionEmpaque,
    CompraMadera,
    Recepcion,
    TemporadaBodega,
)
from gestion_bodega.utils.kpis import build_alerts
from gestion_huerta.models import (
    Cosecha,
    Huerta,
    HuertaRentada,
    InversionesHuerta,
    Temporada,
    Venta,
)
from gestion_usuarios.models import RegistroActividad, Users

DECIMAL_ZERO = Decimal("0.00")
MONEY_FIELD = DecimalField(max_digits=18, decimal_places=2)
SALE_TOTAL_EXPR = ExpressionWrapper(F("num_cajas") * F("precio_por_caja"), output_field=MONEY_FIELD)
INV_TOTAL_EXPR = ExpressionWrapper(F("gastos_insumos") + F("gastos_mano_obra"), output_field=MONEY_FIELD)


def _plain_permissions(user: Users) -> set[str]:
    cached = getattr(user, "_dashboard_permission_cache", None)
    if cached is not None:
        return cached

    if getattr(user, "role", "") == "admin" or getattr(user, "is_superuser", False):
        cached = {"__all__"}
    else:
        cached = {
            perm.split(".", 1)[1]
            for perm in user.get_all_permissions()
            if perm and "." in perm
        }
    setattr(user, "_dashboard_permission_cache", cached)
    return cached


def _can(user: Users, *codenames: str) -> bool:
    perms = _plain_permissions(user)
    return "__all__" in perms or any(code in perms for code in codenames)


def _to_number(value: Any) -> float | int:
    if value in (None, "", False):
        return 0
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, Decimal):
        if value == value.to_integral():
            return int(value)
        return round(float(value), 2)
    if isinstance(value, float):
        if value.is_integer():
            return int(value)
        return round(value, 2)
    try:
        return _to_number(Decimal(str(value)))
    except Exception:
        return 0


def _format_count(value: Any) -> str:
    return f"{int(_to_number(value)):,}"


def _format_currency(value: Any) -> str:
    amount = Decimal(str(_to_number(value)))
    if amount == amount.to_integral():
        return f"${int(amount):,}"
    return f"${amount:,.2f}"


def _delta_payload(current: Any, previous: Any) -> dict[str, Any]:
    current_dec = Decimal(str(_to_number(current)))
    previous_dec = Decimal(str(_to_number(previous)))
    delta = current_dec - previous_dec
    if delta > 0:
        direction = "up"
    elif delta < 0:
        direction = "down"
    else:
        direction = "flat"

    delta_pct = None
    if previous_dec != 0:
        delta_pct = round(float((delta / previous_dec) * Decimal("100")), 1)

    return {
        "current": _to_number(current_dec),
        "previous": _to_number(previous_dec),
        "delta": _to_number(delta),
        "delta_pct": delta_pct,
        "direction": direction,
    }


def _metric(
    *,
    metric_id: str,
    label: str,
    value: Any,
    display: str,
    helper: str,
    tone: str,
    icon: str,
) -> dict[str, Any]:
    return {
        "id": metric_id,
        "label": label,
        "value": _to_number(value),
        "display": display,
        "helper": helper,
        "tone": tone,
        "icon": icon,
    }


def _action(
    *,
    action_id: str,
    title: str,
    description: str,
    to: str,
    tone: str,
    icon: str,
) -> dict[str, Any]:
    return {
        "id": action_id,
        "title": title,
        "description": description,
        "to": to,
        "tone": tone,
        "icon": icon,
    }


def _with_query(path: str, params: dict[str, Any] | None = None) -> str:
    safe = {
        key: value
        for key, value in (params or {}).items()
        if value is not None and value != ""
    }
    if not safe:
        return path
    return f"{path}?{urlencode(safe)}"


def _huerta_origin_name(temporada: Temporada | None) -> str:
    if temporada is None:
        return ""
    if temporada.huerta_id:
        return temporada.huerta.nombre
    if temporada.huerta_rentada_id:
        return temporada.huerta_rentada.nombre
    return ""


def _huerta_profile_link(huerta_id: int) -> str:
    return f"/reportes/huerta/{huerta_id}/perfil"


def _temporada_report_link(temporada_id: int) -> str:
    return f"/reportes/temporada/{temporada_id}"


def _cosecha_report_link(cosecha_id: int) -> str:
    return f"/reportes/cosecha/{cosecha_id}"


def _bodega_temporadas_link(bodega: Bodega) -> str:
    return _with_query(
        f"/bodega/{bodega.id}/temporadas",
        {
            "b": bodega.id,
            "bodega_nombre": bodega.nombre,
            "bodega_ubicacion": bodega.ubicacion,
        },
    )


def _bodega_tablero_link(temporada: TemporadaBodega) -> str:
    return _with_query(
        "/bodega/tablero",
        {"bodega": temporada.bodega_id, "temporada": temporada.id},
    )


def _activity_category(activity: RegistroActividad) -> str:
    accion = (activity.accion or "").lower()
    detalles = (activity.detalles or "").lower()
    if "denegado" in accion or "bloqueado" in accion or "permiso_requerido=" in detalles:
        return "seguridad"
    if "sesion" in accion or "login" in accion or "contrase" in accion:
        return "autenticacion"
    if any(token in accion or token in detalles for token in ("huerta", "cosecha", "temporada", "venta", "inversion", "propietario")):
        return "gestion_huerta"
    if any(token in accion or token in detalles for token in ("bodega", "recepcion", "camion", "madera", "consumible", "empaque", "semana")):
        return "gestion_bodega"
    if "usuario" in accion or "permiso" in accion:
        return "gestion_usuarios"
    return "sistema"


def _activity_severity(activity: RegistroActividad) -> str:
    accion = (activity.accion or "").lower()
    detalles = (activity.detalles or "").lower()
    if "denegado" in accion or "fallido" in accion or "bloque" in accion:
        return "warning"
    if any(token in accion or token in detalles for token in ("elim", "archiv", "restaur", "finaliz", "reactiv")):
        return "info"
    return "success"


def _link_from_bodega_alert(raw_alert: dict[str, Any]) -> str | None:
    link = raw_alert.get("link") or {}
    path = link.get("path")
    if not path:
        return None
    return _with_query(path, link.get("query"))


def build_dashboard_overview(user: Users) -> dict[str, Any]:
    today = timezone.localdate()
    d7 = today - timedelta(days=6)
    p7 = today - timedelta(days=13)
    p7_end = today - timedelta(days=7)
    d30 = today - timedelta(days=29)
    p30 = today - timedelta(days=59)
    p30_end = today - timedelta(days=30)
    d14 = today - timedelta(days=13)

    access = {
        "admin": getattr(user, "role", "") == "admin",
        "huerta": _can(user, "view_huerta", "view_huertarentada", "view_temporada", "view_cosecha", "view_venta", "view_inversioneshuerta"),
        "finanzas": _can(user, "view_venta", "view_inversioneshuerta"),
        "bodega": _can(user, "view_bodega", "view_temporadabodega", "view_dashboard", "view_recepcion", "view_clasificacionempaque", "view_camionsalida", "view_compramadera", "view_consumible"),
        "tablero": _can(user, "view_dashboard"),
    }

    temporadas_qs = Temporada.objects.select_related("huerta", "huerta_rentada").filter(is_active=True, finalizada=False).order_by("-fecha_inicio", "-id")
    temporadas_qs = temporadas_qs.filter(estado_operativo=Temporada.EstadoOperativo.OPERATIVA)
    featured_temporada = temporadas_qs.first() if access["huerta"] else None
    active_huertas = Huerta.objects.filter(is_active=True).count() + HuertaRentada.objects.filter(is_active=True).count() if access["huerta"] else 0
    active_temporadas = temporadas_qs.count() if access["huerta"] else 0
    active_cosechas = Cosecha.objects.filter(is_active=True, finalizada=False).count() if access["huerta"] else 0
    temporadas_sin_cosecha = temporadas_qs.annotate(cosechas_activas=Count("cosechas", filter=Q(cosechas__is_active=True))).filter(cosechas_activas=0).count() if access["huerta"] else 0
    cosechas_sin_venta = Cosecha.objects.filter(is_active=True, finalizada=False).annotate(
        ventas_recientes=Count("ventas", filter=Q(ventas__is_active=True, ventas__fecha_venta__gte=d14))
    ).filter(ventas_recientes=0).count() if access["huerta"] else 0

    sales_now = Venta.objects.filter(is_active=True, fecha_venta__gte=d30, fecha_venta__lte=today).aggregate(total=Coalesce(Sum(SALE_TOTAL_EXPR), Value(DECIMAL_ZERO)))["total"] if access["finanzas"] else DECIMAL_ZERO
    sales_prev = Venta.objects.filter(is_active=True, fecha_venta__gte=p30, fecha_venta__lte=p30_end).aggregate(total=Coalesce(Sum(SALE_TOTAL_EXPR), Value(DECIMAL_ZERO)))["total"] if access["finanzas"] else DECIMAL_ZERO
    invest_now = InversionesHuerta.objects.filter(is_active=True, fecha__gte=d30, fecha__lte=today).aggregate(total=Coalesce(Sum(INV_TOTAL_EXPR), Value(DECIMAL_ZERO)))["total"] if access["finanzas"] else DECIMAL_ZERO
    invest_prev = InversionesHuerta.objects.filter(is_active=True, fecha__gte=p30, fecha__lte=p30_end).aggregate(total=Coalesce(Sum(INV_TOTAL_EXPR), Value(DECIMAL_ZERO)))["total"] if access["finanzas"] else DECIMAL_ZERO

    temporadas_bodega_qs = TemporadaBodega.objects.select_related("bodega").filter(is_active=True, finalizada=False, bodega__is_active=True).order_by("-fecha_inicio", "-id")
    featured_bodega = temporadas_bodega_qs.first() if access["bodega"] else None
    active_bodegas = Bodega.objects.filter(is_active=True).count() if access["bodega"] else 0
    active_bodega_temporadas = temporadas_bodega_qs.count() if access["bodega"] else 0
    open_weeks = CierreSemanal.objects.filter(is_active=True, fecha_hasta__isnull=True, temporada__is_active=True, temporada__finalizada=False).count() if access["bodega"] else 0
    recepciones_now = Recepcion.objects.filter(is_active=True, temporada__is_active=True, temporada__finalizada=False, fecha__gte=d7, fecha__lte=today).aggregate(total=Coalesce(Sum("cajas_campo"), 0))["total"] if access["bodega"] else 0
    recepciones_prev = Recepcion.objects.filter(is_active=True, temporada__is_active=True, temporada__finalizada=False, fecha__gte=p7, fecha__lte=p7_end).aggregate(total=Coalesce(Sum("cajas_campo"), 0))["total"] if access["bodega"] else 0
    empaque_now = ClasificacionEmpaque.objects.filter(is_active=True, temporada__is_active=True, temporada__finalizada=False, fecha__gte=d7, fecha__lte=today).aggregate(total=Coalesce(Sum("cantidad_cajas"), 0))["total"] if access["bodega"] else 0
    empaque_prev = ClasificacionEmpaque.objects.filter(is_active=True, temporada__is_active=True, temporada__finalizada=False, fecha__gte=p7, fecha__lte=p7_end).aggregate(total=Coalesce(Sum("cantidad_cajas"), 0))["total"] if access["bodega"] else 0
    despachos_now = CamionSalida.objects.filter(is_active=True, temporada__is_active=True, temporada__finalizada=False, fecha_salida__gte=d7, fecha_salida__lte=today).aggregate(total=Coalesce(Sum("cargas__cantidad", filter=Q(cargas__is_active=True)), 0))["total"] if access["bodega"] else 0
    despachos_prev = CamionSalida.objects.filter(is_active=True, temporada__is_active=True, temporada__finalizada=False, fecha_salida__gte=p7, fecha_salida__lte=p7_end).aggregate(total=Coalesce(Sum("cargas__cantidad", filter=Q(cargas__is_active=True)), 0))["total"] if access["bodega"] else 0
    madera_stock = CompraMadera.objects.filter(is_active=True, temporada__is_active=True, temporada__finalizada=False).aggregate(total=Coalesce(Sum("stock_actual"), Value(DECIMAL_ZERO)))["total"] if access["bodega"] else DECIMAL_ZERO

    pending_passwords = Users.objects.filter(is_active=True, must_change_password=True).count() if access["admin"] else 0
    security_events = RegistroActividad.objects.filter(fecha_hora__date__gte=d7).filter(Q(accion__iregex=r"(denegad|bloquead|fallid)") | Q(detalles__icontains="permiso_requerido=")).count() if access["admin"] else 0

    alerts = []
    if temporadas_sin_cosecha:
        alerts.append({"id": "huerta-gap", "source": "Huerta", "severity": "warning", "title": "Temporadas activas sin cosecha", "description": f"{temporadas_sin_cosecha} temporadas siguen abiertas sin una cosecha activa.", "to": "/temporadas", "cta": "Revisar temporadas"})
    if cosechas_sin_venta:
        alerts.append({"id": "huerta-sales-gap", "source": "Huerta", "severity": "info", "title": "Cosechas sin venta reciente", "description": f"{cosechas_sin_venta} cosechas no registran ventas en los ultimos 14 dias.", "to": _temporada_report_link(featured_temporada.id) if featured_temporada else "/temporadas", "cta": "Abrir temporadas"})
    if active_bodega_temporadas and open_weeks == 0 and featured_bodega and access["tablero"]:
        alerts.append({"id": "bodega-week-gap", "source": "Bodega", "severity": "critical", "title": "Bodega sin semana abierta", "description": "Hay temporada de bodega activa pero ninguna semana operativa abierta.", "to": _bodega_tablero_link(featured_bodega), "cta": "Abrir tablero"})
    if int(recepciones_now) > int(empaque_now) and recepciones_now:
        alerts.append({"id": "bodega-backlog", "source": "Bodega", "severity": "warning", "title": "Recepcion por arriba del empaque", "description": f"Entraron {int(recepciones_now):,} cajas y se empacaron {int(empaque_now):,} en 7 dias.", "to": _bodega_tablero_link(featured_bodega) if featured_bodega else "/bodega", "cta": "Ver tablero"})
    if madera_stock <= 0 and active_bodega_temporadas:
        alerts.append({"id": "bodega-wood-stock", "source": "Bodega", "severity": "critical", "title": "Stock de madera agotado", "description": "No queda stock disponible en compras activas de madera.", "to": _bodega_temporadas_link(featured_bodega.bodega) if featured_bodega else "/bodega", "cta": "Revisar inventario"})
    if access["admin"] and pending_passwords:
        alerts.append({"id": "admin-passwords", "source": "Administracion", "severity": "info", "title": "Usuarios con alta pendiente", "description": f"{pending_passwords} cuentas aun deben cambiar contrasena.", "to": "/users-admin", "cta": "Gestionar usuarios"})
    if featured_bodega and access["tablero"]:
        for raw in build_alerts(temporada_id=featured_bodega.id, bodega_id=featured_bodega.bodega_id, filters=None):
            alerts.append({"id": f"bodega-{raw.get('code', 'alerta').lower()}", "source": "Bodega", "severity": raw.get("severity", "info"), "title": raw.get("title") or "Alerta operativa", "description": raw.get("description") or "", "to": _link_from_bodega_alert(raw), "cta": "Abrir contexto"})
    alerts = sorted(alerts, key=lambda item: {"critical": 0, "warning": 1, "info": 2}.get(item["severity"], 9))[:6]

    next_action = _action(action_id="next-profile", title="Revisar tu perfil", description="Mantener tus datos y seguridad personales al dia.", to="/profile", tone="slate", icon="user-round")
    if getattr(user, "must_change_password", False):
        next_action = _action(action_id="next-password", title="Cambiar tu contrasena ahora", description="Es el cierre pendiente mas importante para asegurar tu sesion.", to="/change-password", tone="critical", icon="lock-keyhole")
    elif alerts and alerts[0].get("to"):
        next_action = _action(action_id="next-alert", title=alerts[0]["title"], description=alerts[0]["description"], to=alerts[0]["to"], tone="critical" if alerts[0]["severity"] == "critical" else "amber", icon="sparkle")
    elif featured_bodega and access["tablero"]:
        next_action = _action(action_id="next-board", title="Abrir tablero operativo", description=f"Ir a {featured_bodega.bodega.nombre} y seguir la temporada actual.", to=_bodega_tablero_link(featured_bodega), tone="sky", icon="warehouse")
    elif featured_temporada and access["huerta"]:
        next_action = _action(action_id="next-season", title=f"Revisar temporada {featured_temporada.año}", description="Abrir el reporte mas cercano a la operacion actual en huerta.", to=_temporada_report_link(featured_temporada.id), tone="emerald", icon="leaf")

    sales_delta = _delta_payload(sales_now, sales_prev)
    invest_delta = _delta_payload(invest_now, invest_prev)
    recep_delta = _delta_payload(recepciones_now, recepciones_prev)
    empaque_delta = _delta_payload(empaque_now, empaque_prev)
    despacho_delta = _delta_payload(despachos_now, despachos_prev)

    timeline_qs = RegistroActividad.objects.select_related("usuario").order_by("-fecha_hora")
    if not access["admin"]:
        timeline_qs = timeline_qs.filter(usuario=user)
    timeline = [{"id": item.id, "title": item.accion, "description": item.detalles or "Movimiento registrado en el sistema.", "category": _activity_category(item), "severity": _activity_severity(item), "created_at": item.fecha_hora.isoformat(), "user_name": item.usuario.get_full_name(), "to": "/profile" if _activity_category(item) == "autenticacion" else "/activity-log" if access["admin"] else None} for item in timeline_qs[:8]]

    return {
        "generated_at": timezone.now().isoformat(),
        "hero": {
            "headline": "Centro de mando inteligente",
            "support": "El sistema ya no solo te muestra modulos. Te dice donde actuar, que revisar y que podria romper el ritmo antes de que te quite tiempo.",
            "badges": [f"{int(access['huerta']) + int(access['bodega']) + int(access['admin'])} frentes visibles", f"{len(alerts)} focos detectados", "Actualizado en tiempo real"],
            "stats": [
                _metric(metric_id="hero-temporadas", label="Temporadas activas", value=active_temporadas, display=_format_count(active_temporadas), helper="Ciclos abiertos en huerta.", tone="emerald", icon="calendar-range"),
                _metric(metric_id="hero-cosechas", label="Cosechas abiertas", value=active_cosechas, display=_format_count(active_cosechas), helper="Cosechas activas para seguimiento.", tone="amber", icon="sprout"),
                _metric(metric_id="hero-recepciones", label="Recepcion 7 dias", value=recepciones_now, display=f"{int(recepciones_now):,} cajas", helper="Pulso operativo de bodega.", tone="sky", icon="inbox"),
                _metric(metric_id="hero-passwords", label="Usuarios pendientes", value=pending_passwords, display=_format_count(pending_passwords), helper="Altas que aun no cierran seguridad.", tone="slate", icon="shield"),
            ],
        },
        "today": {
            "title": "Tu dia en 90 segundos",
            "subtitle": "Lectura corta con datos vivos del sistema.",
            "cards": [
                _metric(metric_id="sales-30d", label="Ventas 30 dias", value=sales_now, display=_format_currency(sales_now), helper="Ingreso bruto reciente en huerta.", tone="emerald", icon="line-chart"),
                _metric(metric_id="invest-30d", label="Inversion 30 dias", value=invest_now, display=_format_currency(invest_now), helper="Suma de insumos y mano de obra del mismo periodo.", tone="amber", icon="coins"),
                _metric(metric_id="recepciones-7d", label="Recepcion 7 dias", value=recepciones_now, display=f"{int(recepciones_now):,} cajas", helper="Producto que realmente entro a bodega.", tone="sky", icon="inbox"),
                _metric(metric_id="empaque-7d", label="Empaque 7 dias", value=empaque_now, display=f"{int(empaque_now):,} cajas", helper="Volumen empaquetado en el bloque actual.", tone="violet", icon="package"),
                _metric(metric_id="stock-madera", label="Stock de madera", value=madera_stock, display=f"{_format_count(madera_stock)} cajas", helper="Disponibilidad fisica de compras activas.", tone="slate", icon="boxes"),
            ],
        },
        "next_action": {
            "title": next_action["title"],
            "description": next_action["description"],
            "to": next_action["to"],
            "tone": next_action["tone"],
            "icon": next_action["icon"],
            "alternatives": [
                _action(action_id="alt-board", title="Abrir tablero" if featured_bodega else "Elegir bodega", description="Entrar al flujo operativo de bodega." if featured_bodega else "Primero elige una bodega y su temporada activa.", to=_bodega_tablero_link(featured_bodega) if featured_bodega else "/bodega", tone="sky", icon="warehouse"),
                _action(action_id="alt-huerta", title="Ver huertas", description="Entrar al seguimiento agricola.", to="/huertas", tone="emerald", icon="sprout"),
                _action(action_id="alt-profile", title="Ir a perfil", description="Revisar tu cuenta y seguridad.", to="/profile", tone="slate", icon="user-round"),
            ],
        },
        "alerts": alerts,
        "insights": [
            {"id": "insight-sales", "eyebrow": "Ritmo comercial", "title": "Las ventas recientes ya muestran tendencia", "description": f"Ultimos 30 dias: {_format_currency(sales_now)}. Bloque previo: {_format_currency(sales_prev)}.", "tone": "positive" if sales_delta["direction"] == "up" else "warning" if sales_delta["direction"] == "down" else "neutral", "to": _temporada_report_link(featured_temporada.id) if featured_temporada else "/temporadas", "cta": "Ver temporada"},
            {"id": "insight-flow", "eyebrow": "Flujo de bodega", "title": f"El empaque esta cubriendo {round((int(empaque_now) / max(int(recepciones_now), 1)) * 100, 1) if recepciones_now else 0}% de la recepcion reciente", "description": f"Recepcion 7 dias: {int(recepciones_now):,} cajas. Empaque 7 dias: {int(empaque_now):,}.", "tone": "positive" if recepciones_now and int(empaque_now) >= int(recepciones_now) else "warning", "to": _bodega_tablero_link(featured_bodega) if featured_bodega else "/bodega", "cta": "Abrir tablero"},
            {"id": "insight-gap", "eyebrow": "Operacion", "title": "Hay frentes que se pueden desbloquear rapido", "description": f"{temporadas_sin_cosecha} temporadas sin cosecha y {cosechas_sin_venta} cosechas sin venta reciente.", "tone": "neutral", "to": "/temporadas", "cta": "Ver frentes"},
            {"id": "insight-security", "eyebrow": "Seguridad", "title": "El acceso inicial todavia necesita cierres", "description": f"{pending_passwords} usuarios pendientes y {security_events} eventos de seguridad en 7 dias.", "tone": "neutral", "to": "/users-admin" if access["admin"] else "/profile", "cta": "Revisar seguridad"},
        ],
        "comparisons": [
            {"id": "compare-sales-30d", "label": "Ventas 30 dias", "current_label": "Ultimos 30 dias", "previous_label": "30 dias previos", "current_display": _format_currency(sales_now), "previous_display": _format_currency(sales_prev), **sales_delta, "helper": "Compara ingreso bruto reciente.", "tone": "emerald" if sales_delta["direction"] == "up" else "rose" if sales_delta["direction"] == "down" else "slate", "to": _temporada_report_link(featured_temporada.id) if featured_temporada else "/temporadas"},
            {"id": "compare-invest-30d", "label": "Inversion 30 dias", "current_label": "Ultimos 30 dias", "previous_label": "30 dias previos", "current_display": _format_currency(invest_now), "previous_display": _format_currency(invest_prev), **invest_delta, "helper": "Vigila si el gasto se dispara.", "tone": "amber" if invest_delta["direction"] == "up" else "emerald" if invest_delta["direction"] == "down" else "slate", "to": _temporada_report_link(featured_temporada.id) if featured_temporada else "/temporadas"},
            {"id": "compare-recepciones-7d", "label": "Recepcion 7 dias", "current_label": "Ultimos 7 dias", "previous_label": "7 dias previos", "current_display": f"{int(recepciones_now):,} cajas", "previous_display": f"{int(recepciones_prev):,} cajas", **recep_delta, "helper": "Pulso de entrada real a bodega.", "tone": "emerald" if recep_delta["direction"] == "up" else "slate", "to": _bodega_tablero_link(featured_bodega) if featured_bodega else "/bodega"},
            {"id": "compare-empaque-7d", "label": "Empaque 7 dias", "current_label": "Ultimos 7 dias", "previous_label": "7 dias previos", "current_display": f"{int(empaque_now):,} cajas", "previous_display": f"{int(empaque_prev):,} cajas", **empaque_delta, "helper": "Mide la salida del cuello principal.", "tone": "emerald" if empaque_delta["direction"] == "up" else "slate", "to": _bodega_tablero_link(featured_bodega) if featured_bodega else "/bodega"},
            {"id": "compare-despachos-7d", "label": "Despachos 7 dias", "current_label": "Ultimos 7 dias", "previous_label": "7 dias previos", "current_display": f"{int(despachos_now):,} cajas", "previous_display": f"{int(despachos_prev):,} cajas", **despacho_delta, "helper": "Comprueba si logistica acompana el ritmo.", "tone": "emerald" if despacho_delta["direction"] == "up" else "slate", "to": _bodega_tablero_link(featured_bodega) if featured_bodega else "/bodega"},
        ],
        "timeline": timeline,
        "modules": [
            {
                "id": "huerta",
                "label": "Huerta",
                "summary": f"{active_temporadas} temporadas activas y {active_cosechas} cosechas en seguimiento.",
                "metrics": [
                    _metric(metric_id="mod-huertas", label="Huertas activas", value=active_huertas, display=_format_count(active_huertas), helper="Propias y rentadas con operacion vigente.", tone="emerald", icon="trees"),
                    _metric(metric_id="mod-temporadas", label="Temporadas activas", value=active_temporadas, display=_format_count(active_temporadas), helper="Ciclos abiertos para seguimiento.", tone="sky", icon="calendar"),
                    _metric(metric_id="mod-cosechas", label="Cosechas abiertas", value=active_cosechas, display=_format_count(active_cosechas), helper="Frentes con actividad de campo o finanzas.", tone="amber", icon="sprout"),
                ],
                "primary_action": _action(action_id="huerta-primary", title=f"Revisar temporada {featured_temporada.año}" if featured_temporada else "Entrar a huertas", description="Abrir seguimiento agricola con contexto.", to=_temporada_report_link(featured_temporada.id) if featured_temporada else "/huertas", tone="emerald", icon="sprout"),
                "secondary_actions": [_action(action_id="huerta-secondary", title="Elegir temporada", description="Entrar al indice de temporadas para bajar al detalle correcto.", to="/temporadas", tone="ghost", icon="leaf")],
            },
            {
                "id": "bodega",
                "label": "Bodega",
                "summary": f"{open_weeks} semanas abiertas, {int(recepciones_now):,} cajas recibidas y {int(empaque_now):,} empacadas en 7 dias.",
                "metrics": [
                    _metric(metric_id="mod-bodegas", label="Bodegas activas", value=active_bodegas, display=_format_count(active_bodegas), helper="Unidades con operacion vigente.", tone="sky", icon="warehouse"),
                    _metric(metric_id="mod-bodega-temporadas", label="Temporadas de bodega", value=active_bodega_temporadas, display=_format_count(active_bodega_temporadas), helper="Temporadas abiertas en operacion.", tone="violet", icon="calendar"),
                    _metric(metric_id="mod-open-weeks", label="Semanas abiertas", value=open_weeks, display=_format_count(open_weeks), helper="Contextos activos para capturas y tablero.", tone="amber", icon="clock-3"),
                ],
                "primary_action": _action(action_id="bodega-primary", title="Abrir tablero operativo" if featured_bodega else "Entrar a bodega", description="Entrar al flujo operativo con el contexto mas reciente.", to=_bodega_tablero_link(featured_bodega) if featured_bodega else "/bodega", tone="sky", icon="warehouse"),
                "secondary_actions": [_action(action_id="bodega-secondary", title="Abrir logistica" if featured_bodega else "Elegir bodega", description="Revisar camiones y salidas." if featured_bodega else "Selecciona primero una bodega para continuar a logistica.", to=f"/bodega/{featured_bodega.bodega_id}/logistica" if featured_bodega else "/bodega", tone="ghost", icon="truck")],
            },
            {
                "id": "admin",
                "label": "Administracion",
                "summary": f"{pending_passwords} usuarios con onboarding pendiente y {security_events} eventos de seguridad en 7 dias.",
                "metrics": [
                    _metric(metric_id="mod-users", label="Usuarios pendientes", value=pending_passwords, display=_format_count(pending_passwords), helper="Cuentas que aun no cambian contrasena.", tone="amber", icon="key-round"),
                    _metric(metric_id="mod-security", label="Eventos de seguridad", value=security_events, display=_format_count(security_events), helper="Intentos fallidos, bloqueos y permisos denegados.", tone="rose", icon="shield-alert"),
                ],
                "primary_action": _action(action_id="admin-primary", title="Abrir usuarios", description="Gestionar accesos, permisos y estados.", to="/users-admin", tone="slate", icon="shield"),
                "secondary_actions": [_action(action_id="admin-secondary", title="Ver actividad", description="Auditar movimientos del sistema.", to="/activity-log", tone="ghost", icon="history")],
            },
        ],
        "contexts": {
            "featured_temporada": {"id": featured_temporada.id, "label": f"{_huerta_origin_name(featured_temporada)} / {featured_temporada.año}", "to": _temporada_report_link(featured_temporada.id)} if featured_temporada else None,
            "featured_bodega": {"id": featured_bodega.id, "label": f"{featured_bodega.bodega.nombre} / {featured_bodega.año}", "to": _bodega_tablero_link(featured_bodega)} if featured_bodega else None,
        },
    }


def build_dashboard_search(user: Users, query: str) -> dict[str, Any]:
    term = (query or "").strip()
    if len(term) < 2:
        return {"query": term, "results": [], "meta": {"total": 0}}

    access = {
        "admin": getattr(user, "role", "") == "admin",
        "huertas": _can(user, "view_huerta", "view_huertarentada"),
        "temporadas": _can(user, "view_temporada"),
        "cosechas": _can(user, "view_cosecha"),
        "bodegas": _can(user, "view_bodega", "view_temporadabodega"),
        "tablero": _can(user, "view_dashboard"),
    }
    results: list[dict[str, Any]] = []

    if access["huertas"]:
        for item in Huerta.objects.select_related("propietario").filter(is_active=True).filter(
            Q(nombre__icontains=term) | Q(ubicacion__icontains=term) | Q(propietario__nombre__icontains=term) | Q(propietario__apellidos__icontains=term)
        )[:4]:
            results.append({"id": f"huerta-{item.id}", "group": "Huertas", "kind": "entity", "title": item.nombre, "subtitle": f"{item.ubicacion} · {item.propietario}", "meta": "Huerta propia", "to": _huerta_profile_link(item.id)})

        for item in HuertaRentada.objects.select_related("propietario").filter(is_active=True).filter(
            Q(nombre__icontains=term) | Q(ubicacion__icontains=term) | Q(propietario__nombre__icontains=term) | Q(propietario__apellidos__icontains=term)
        )[:4]:
            results.append({"id": f"huerta-rentada-{item.id}", "group": "Huertas", "kind": "entity", "title": item.nombre, "subtitle": f"{item.ubicacion} · {item.propietario}", "meta": "Huerta rentada", "to": _huerta_profile_link(item.id)})

    if access["temporadas"]:
        temporadas_q = Q(huerta__nombre__icontains=term) | Q(huerta_rentada__nombre__icontains=term)
        if term.isdigit():
            temporadas_q |= Q(año=int(term))
        for item in (
            Temporada.objects
            .select_related("huerta", "huerta_rentada")
            .filter(is_active=True, estado_operativo=Temporada.EstadoOperativo.OPERATIVA)
            .filter(temporadas_q)[:4]
        ):
            results.append({"id": f"temporada-{item.id}", "group": "Temporadas", "kind": "entity", "title": f"Temporada {item.año}", "subtitle": _huerta_origin_name(item) or "Temporada activa", "meta": "Huerta", "to": _temporada_report_link(item.id)})

    if access["cosechas"]:
        for item in Cosecha.objects.select_related("temporada", "huerta", "huerta_rentada").filter(is_active=True).filter(
            Q(nombre__icontains=term) | Q(temporada__huerta__nombre__icontains=term) | Q(temporada__huerta_rentada__nombre__icontains=term)
        )[:6]:
            origin_name = item.huerta.nombre if item.huerta_id else item.huerta_rentada.nombre if item.huerta_rentada_id else "Cosecha"
            results.append({"id": f"cosecha-{item.id}", "group": "Cosechas", "kind": "entity", "title": item.nombre, "subtitle": f"{origin_name} · Temp {item.temporada.año}", "meta": "Huerta", "to": _cosecha_report_link(item.id)})

    if access["bodegas"] or access["tablero"]:
        for item in Bodega.objects.filter(is_active=True).filter(Q(nombre__icontains=term) | Q(ubicacion__icontains=term))[:4]:
            results.append({"id": f"bodega-{item.id}", "group": "Bodegas", "kind": "entity", "title": item.nombre, "subtitle": item.ubicacion or "Sin ubicacion registrada", "meta": "Bodega", "to": _bodega_temporadas_link(item)})

        temporadas_bodega_q = Q(bodega__nombre__icontains=term)
        if term.isdigit():
            temporadas_bodega_q |= Q(año=int(term))
        for item in TemporadaBodega.objects.select_related("bodega").filter(is_active=True).filter(temporadas_bodega_q)[:6]:
            results.append({"id": f"temporada-bodega-{item.id}", "group": "Operacion de bodega", "kind": "entity", "title": f"{item.bodega.nombre} · {item.año}", "subtitle": "Temporada de bodega", "meta": "Tablero", "to": _bodega_tablero_link(item) if access["tablero"] else _bodega_temporadas_link(item.bodega)})

    if access["admin"]:
        for item in Users.objects.filter(is_active=True).filter(Q(nombre__icontains=term) | Q(apellido__icontains=term) | Q(telefono__icontains=term))[:4]:
            results.append({"id": f"user-{item.id}", "group": "Usuarios", "kind": "entity", "title": item.get_full_name(), "subtitle": item.telefono, "meta": item.role, "to": "/users-admin"})

    return {"query": term, "results": results[:18], "meta": {"total": len(results)}}
