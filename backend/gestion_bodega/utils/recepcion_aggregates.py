from django.db.models import OuterRef, Subquery, Sum, IntegerField, Value, Case, When, F, CharField
from django.db.models.functions import Coalesce
from gestion_bodega.models import ClasificacionEmpaque

def annotate_recepcion_status(queryset):
    """
    Annotates the Recepcion queryset with:
    - cajas_empaquetadas: Sum of active ClasificacionEmpaque.cantidad_cajas
    - cajas_merma: Sum of active ClasificacionEmpaque.cantidad_cajas where calidad="MERMA"
    - cajas_disponibles: cajas_campo - cajas_empaquetadas
    - empaque_status: SIN_EMPAQUE | PARCIAL | EMPACADO
    """
    
    # Subquery to sum active packed boxes (Total)
    packed_qs = ClasificacionEmpaque.objects.filter(
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
        cajas_empaquetadas=Coalesce(Subquery(packed_qs, output_field=IntegerField()), Value(0)),
        cajas_merma=Coalesce(Subquery(merma_qs, output_field=IntegerField()), Value(0)),
    )
    
    # Second annotation pass: Calculate derivatives based on aggregates
    qs = qs.annotate(
        cajas_disponibles=Case(
            When(cajas_campo__isnull=True, then=Value(0)),
            default=F("cajas_campo") - F("cajas_empaquetadas"),
            output_field=IntegerField()
        ),
        empaque_status=Case(
             When(cajas_empaquetadas__lte=0, then=Value("SIN_EMPAQUE")),
             When(cajas_campo__gt=0, cajas_empaquetadas__gte=F("cajas_campo"), then=Value("EMPACADO")),
             default=Value("PARCIAL"),
             output_field=CharField(max_length=20) 
        )
    )
    
    return qs
