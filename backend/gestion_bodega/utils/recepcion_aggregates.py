from django.db.models import OuterRef, Subquery, Sum, IntegerField, Value, Case, When, F, CharField, Q
from django.db.models.functions import Coalesce
from gestion_bodega.models import ClasificacionEmpaque

def annotate_recepcion_status(queryset):
    """
    Annotates the Recepcion queryset with:
    - cajas_empaquetadas: Sum of active ClasificacionEmpaque.cantidad_cajas EXCLUDING MERMA
    - cajas_merma: Sum of active ClasificacionEmpaque.cantidad_cajas where calidad="MERMA"
    - cajas_empaquetadas_total: Total including MERMA (for reference)
    - cajas_disponibles: cajas_campo - cajas_empaquetadas (excludes MERMA)
    - empaque_status: SIN_EMPAQUE | PARCIAL | EMPACADO | MERMA_TOTAL
    """
    
    # Subquery: cajas empacadas REALES (sin MERMA)
    packed_real_qs = ClasificacionEmpaque.objects.filter(
        recepcion=OuterRef("pk"),
        is_active=True
    ).exclude(
        calidad__iexact="MERMA"
    ).values("recepcion").annotate(
        total=Sum("cantidad_cajas")
    ).values("total")

    # Subquery: todo lo empacado incluyendo MERMA (para referencia)
    packed_all_qs = ClasificacionEmpaque.objects.filter(
        recepcion=OuterRef("pk"),
        is_active=True
    ).values("recepcion").annotate(
        total=Sum("cantidad_cajas")
    ).values("total")

    # Subquery for merma specifically
    merma_qs = ClasificacionEmpaque.objects.filter(
        recepcion=OuterRef("pk"),
        is_active=True,
        calidad__iexact="MERMA"
    ).values("recepcion").annotate(
        total=Sum("cantidad_cajas")
    ).values("total")
    
    # First annotation pass: Fetch aggregates
    qs = queryset.annotate(
        cajas_empaquetadas=Coalesce(Subquery(packed_real_qs, output_field=IntegerField()), Value(0)),
        cajas_empaquetadas_total=Coalesce(Subquery(packed_all_qs, output_field=IntegerField()), Value(0)),
        cajas_merma=Coalesce(Subquery(merma_qs, output_field=IntegerField()), Value(0)),
    )
    
    # Second annotation pass: Calculate derivatives based on aggregates
    qs = qs.annotate(
        # Disponibles = campo - empacado real (sin MERMA)
        cajas_disponibles=Case(
            When(cajas_campo__isnull=True, then=Value(0)),
            default=F("cajas_campo") - F("cajas_empaquetadas"),
            output_field=IntegerField()
        ),
        empaque_status=Case(
             # Nada empacado (incluido merma = 0)
             When(cajas_empaquetadas_total__lte=0, then=Value("SIN_EMPAQUE")),
             # FIX: Todo lo registrado es MERMA → pérdida total, no empacado
             When(
                 cajas_merma__gt=0,
                 cajas_empaquetadas__lte=0,
                 then=Value("MERMA_TOTAL"),
             ),
             # Empacado real cubre la demanda
             When(cajas_campo__gt=0, cajas_empaquetadas__gte=F("cajas_campo"), then=Value("EMPACADO")),
             default=Value("PARCIAL"),
             output_field=CharField(max_length=20) 
        )
    )
    
    return qs

