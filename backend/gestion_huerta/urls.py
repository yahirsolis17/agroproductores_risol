from django.urls import path

from gestion_huerta.views.huerta_views import (
    # Propietarios
    propietario_list, propietario_create, propietario_update, propietario_delete,
    # Huertas Propias
    huerta_list, huerta_create, huerta_update, huerta_delete,
    # Huertas Rentadas
    huerta_rentada_list, huerta_rentada_create, huerta_rentada_update, huerta_rentada_delete,
    # Cosechas
    listar_cosechas_por_huerta, crear_cosecha, obtener_cosecha, actualizar_cosecha, eliminar_cosecha, toggle_estado_cosecha,
    # Categorías de Inversión
    listar_categorias_inversion, crear_categoria_inversion, actualizar_categoria_inversion, eliminar_categoria_inversion,
    # Inversiones
    listar_inversiones_por_cosecha, crear_inversion, actualizar_inversion, eliminar_inversion,
    # Ventas
    listar_ventas_por_cosecha, registrar_venta, actualizar_venta, eliminar_venta
)

app_name = 'gestion_huerta'

urlpatterns = [
    # ------------------- PROPIETARIOS -------------------
    path('propietarios/', propietario_list, name='propietario_list'),
    path('propietario/create/', propietario_create, name='propietario_create'),
    path('propietario/update/<int:pk>/', propietario_update, name='propietario_update'),
    path('propietario/delete/<int:pk>/', propietario_delete, name='propietario_delete'),

    # ------------------- HUERTAS -------------------
    path('huertas/', huerta_list, name='huerta_list'),
    path('huerta/create/', huerta_create, name='huerta_create'),
    path('huerta/update/<int:pk>/', huerta_update, name='huerta_update'),
    path('huerta/delete/<int:pk>/', huerta_delete, name='huerta_delete'),

    # ------------------- HUERTAS RENTADAS -------------------
    path('huertas_rentadas/', huerta_rentada_list, name='huerta_rentada_list'),
    path('huerta_rentada/create/', huerta_rentada_create, name='huerta_rentada_create'),
    path('huerta_rentada/update/<int:pk>/', huerta_rentada_update, name='huerta_rentada_update'),
    path('huerta_rentada/delete/<int:pk>/', huerta_rentada_delete, name='huerta_rentada_delete'),

    # ------------------- COSECHAS -------------------
    path('cosechas/<int:huerta_id>/', listar_cosechas_por_huerta, name='listar_cosechas_por_huerta'),
    path('cosecha/create/', crear_cosecha, name='crear_cosecha'),
    path('cosecha/<int:id>/', obtener_cosecha, name='obtener_cosecha'),
    path('cosecha/<int:id>/update/', actualizar_cosecha, name='actualizar_cosecha'),
    path('cosecha/<int:id>/delete/', eliminar_cosecha, name='eliminar_cosecha'),
    path('cosecha/<int:id>/toggle/', toggle_estado_cosecha, name='toggle_estado_cosecha'),

    # ------------------- CATEGORÍAS DE INVERSIÓN -------------------
    path('categorias/', listar_categorias_inversion, name='categoria_list'),
    path('categoria/create/', crear_categoria_inversion, name='categoria_create'),
    path('categoria/update/<int:id>/', actualizar_categoria_inversion, name='categoria_update'),
    path('categoria/delete/<int:id>/', eliminar_categoria_inversion, name='categoria_delete'),

    # ------------------- INVERSIONES -------------------
    path('inversiones/<int:cosecha_id>/', listar_inversiones_por_cosecha, name='inversion_list'),
    path('inversion/create/', crear_inversion, name='inversion_create'),
    path('inversion/<int:id>/update/', actualizar_inversion, name='inversion_update'),
    path('inversion/<int:id>/delete/', eliminar_inversion, name='inversion_delete'),

    # ------------------- VENTAS -------------------
    path('ventas/<int:cosecha_id>/', listar_ventas_por_cosecha, name='venta_list'),
    path('venta/create/', registrar_venta, name='venta_create'),
    path('venta/<int:id>/update/', actualizar_venta, name='venta_update'),
    path('venta/<int:id>/delete/', eliminar_venta, name='venta_delete'),
]
