# agroproductores_risol/backend/agroproductores_risol/middlewares/ip_restriction.py

import os
from django.http import HttpResponseForbidden
from django.urls import resolve
from django.shortcuts import render

# Se leen las IPs permitidas desde una variable de entorno o se usa un valor por defecto.
#ALLOWED_IPS = os.getenv('ALLOWED_IPS', '127.0.0.1, 192.168.1.102').split(',')

#def ip_restriction(get_response):

#    def middleware(request):
#
#        current_url = resolve(request.path_info).url_name
#        ip = request.META.get('REMOTE_ADDR')
#        if current_url == 'register_admin' and ip not in ALLOWED_IPS:
#            return render(request, 'gestion_sistema/403.html')
#        return get_response(request)
#   return middleware
#