# gestion_bodega/services/week_service.py
"""
Servicio de dominio para gestión de semanas operativas.
Centraliza la lógica de creación/cierre de semanas para garantizar consistencia
entre los endpoints de Tablero y Cierres.
"""
from datetime import date, timedelta
from typing import Optional

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone

from gestion_bodega.models import Bodega, TemporadaBodega, CierreSemanal


class WeekService:
    """
    Servicio para operaciones de semanas operativas.
    Aplica reglas de negocio uniformes:
    - Máximo 7 días por semana (clamp automático)
    - Única semana abierta por bodega/temporada
    - Validaciones consistentes
    """

    @staticmethod
    def start_week(
        bodega: Bodega,
        temporada: TemporadaBodega,
        fecha_desde: date,
        user=None,
        iso_semana: Optional[str] = None,
    ) -> CierreSemanal:
        """
        Inicia una nueva semana operativa (abierta: fecha_hasta = None).

        Args:
            bodega: Instancia de la bodega
            temporada: Instancia de la temporada
            fecha_desde: Fecha de inicio de la semana
            user: Usuario que realiza la operación (para locked_by)
            iso_semana: Etiqueta opcional ISO (YYYY-Www)

        Returns:
            CierreSemanal creado

        Raises:
            ValidationError: Si ya existe una semana abierta o validaciones fallan
        """
        # Validaciones previas
        if not bodega.is_active:
            raise DjangoValidationError("La bodega está archivada; no se pueden crear semanas.")

        if not temporada.is_active or temporada.finalizada:
            raise DjangoValidationError("La temporada está archivada o finalizada.")

        if temporada.bodega_id != bodega.id:
            raise DjangoValidationError("La temporada no pertenece a la bodega indicada.")

        # Generar etiqueta ISO si no viene
        if not iso_semana:
            try:
                iso_cal = fecha_desde.isocalendar()
                iso_semana = f"{iso_cal.year}-W{str(iso_cal.week).zfill(2)}"
            except Exception:
                iso_semana = None

        with transaction.atomic():
            # Verificar que no exista otra semana abierta
            if (
                CierreSemanal.objects.select_for_update()
                .filter(
                    bodega_id=bodega.id,
                    temporada_id=temporada.id,
                    fecha_hasta__isnull=True,
                    is_active=True,
                )
                .exists()
            ):
                raise DjangoValidationError(
                    "Ya existe una semana abierta para esta bodega y temporada."
                )

            # Crear semana abierta
            cierre = CierreSemanal.objects.create(
                bodega=bodega,
                temporada=temporada,
                fecha_desde=fecha_desde,
                fecha_hasta=None,  # Abierta
                iso_semana=iso_semana,
                locked_by=user,
            )

        return cierre

    @staticmethod
    def close_week(
        cierre: CierreSemanal,
        fecha_hasta: date,
        user=None,
    ) -> CierreSemanal:
        """
        Cierra una semana operativa aplicando clamp de 7 días.

        Regla: Si fecha_hasta > fecha_desde + 6 días, se ajusta automáticamente
        al día 7 (fecha_desde + 6).

        Args:
            cierre: Instancia del CierreSemanal a cerrar
            fecha_hasta: Fecha de cierre solicitada
            user: Usuario que realiza la operación

        Returns:
            CierreSemanal actualizado

        Raises:
            ValidationError: Si la semana ya está cerrada o validaciones fallan
        """
        # Verificar que la semana esté abierta
        if cierre.fecha_hasta is not None:
            raise DjangoValidationError("La semana ya está cerrada.")

        # Validar que fecha_hasta no sea anterior al inicio
        if fecha_hasta < cierre.fecha_desde:
            raise DjangoValidationError(
                "La fecha de cierre no puede ser anterior al inicio de la semana."
            )

        # Aplicar clamp: máximo 7 días (fecha_desde + 6)
        limit_date = cierre.fecha_desde + timedelta(days=6)
        if fecha_hasta > limit_date:
            fecha_hasta = limit_date

        # Actualizar semana
        with transaction.atomic():
            cierre.fecha_hasta = fecha_hasta
            cierre.save(update_fields=["fecha_hasta", "actualizado_en"])

        return cierre

    @staticmethod
    def get_active_week(
        bodega: Bodega,
        temporada: TemporadaBodega,
    ) -> Optional[CierreSemanal]:
        """
        Obtiene la semana activa (abierta) para una bodega/temporada.

        Returns:
            CierreSemanal si existe una semana abierta, None en caso contrario
        """
        return (
            CierreSemanal.objects.filter(
                bodega=bodega,
                temporada=temporada,
                is_active=True,
                fecha_hasta__isnull=True,
            )
            .order_by("-fecha_desde")
            .first()
        )
