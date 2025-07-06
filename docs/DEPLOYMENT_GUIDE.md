# Guía de Despliegue - Agroproductores Risol

## 📋 Información General

Esta guía describe el proceso completo para desplegar el sistema de gestión agrícola en un entorno de producción.

## 🏗️ Arquitectura de Producción

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web Server    │    │    Database     │
│    (Nginx)      │────│   (Gunicorn)    │────│    (MySQL)      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────│  Static Files   │──────────────┘
                        │   (Nginx)       │
                        └─────────────────┘
```

## 🚀 Despliegue Backend (Django)

### 1. Preparación del Servidor

#### Actualizar el sistema
```bash
sudo apt update && sudo apt upgrade -y
```

#### Instalar dependencias del sistema
```bash
sudo apt install -y python3 python3-pip python3-venv
sudo apt install -y mysql-server mysql-client
sudo apt install -y nginx
sudo apt install -y git curl wget
sudo apt install -y supervisor  # Para gestión de procesos
```

#### Configurar MySQL
```bash
sudo mysql_secure_installation

# Crear base de datos y usuario
sudo mysql -u root -p
```

```sql
CREATE DATABASE agroproductores_risol_prod;
CREATE USER 'agro_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON agroproductores_risol_prod.* TO 'agro_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Configuración del Proyecto

#### Clonar el repositorio
```bash
cd /opt
sudo git clone https://github.com/yahirsolis17/agroproductores_risol.git
sudo chown -R $USER:$USER /opt/agroproductores_risol
cd /opt/agroproductores_risol
```

#### Crear entorno virtual
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

#### Instalar dependencias
```bash
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn  # Servidor WSGI para producción
```

### 3. Variables de Entorno

#### Crear archivo de configuración
```bash
sudo nano /opt/agroproductores_risol/backend/.env
```

```env
# Configuración de producción
DEBUG=False
SECRET_KEY=tu_clave_secreta_muy_segura_aqui
ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com,IP_DEL_SERVIDOR

# Base de datos
DB_NAME=agroproductores_risol_prod
DB_USER=agro_user
DB_PASSWORD=secure_password_here
DB_HOST=localhost
DB_PORT=3306

# Configuración de archivos estáticos
STATIC_ROOT=/opt/agroproductores_risol/backend/staticfiles
MEDIA_ROOT=/opt/agroproductores_risol/backend/media

# Configuración de email (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-password-de-app

# Configuración de CORS
CORS_ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
```

#### Actualizar settings.py para producción
```bash
nano /opt/agroproductores_risol/backend/agroproductores_risol/settings.py
```

Agregar al final del archivo:
```python
import os
from dotenv import load_dotenv

load_dotenv()

# Configuración de producción
if not DEBUG:
    ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')
    
    # Base de datos desde variables de entorno
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.getenv('DB_NAME'),
            'USER': os.getenv('DB_USER'),
            'PASSWORD': os.getenv('DB_PASSWORD'),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '3306'),
        }
    }
    
    # Archivos estáticos
    STATIC_ROOT = os.getenv('STATIC_ROOT')
    MEDIA_ROOT = os.getenv('MEDIA_ROOT')
    
    # CORS
    CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
    
    # Seguridad adicional
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
```

### 4. Configuración de la Base de Datos

```bash
cd /opt/agroproductores_risol/backend
source venv/bin/activate

# Ejecutar migraciones
python manage.py makemigrations
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Recopilar archivos estáticos
python manage.py collectstatic --noinput
```

### 5. Configuración de Gunicorn

#### Crear archivo de configuración
```bash
sudo nano /opt/agroproductores_risol/backend/gunicorn.conf.py
```

```python
# Configuración de Gunicorn
bind = "127.0.0.1:8000"
workers = 3
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 2
preload_app = True
daemon = False
user = "www-data"
group = "www-data"
tmp_upload_dir = None
logfile = "/var/log/gunicorn/agroproductores_risol.log"
loglevel = "info"
access_logfile = "/var/log/gunicorn/agroproductores_risol_access.log"
error_logfile = "/var/log/gunicorn/agroproductores_risol_error.log"
```

#### Crear directorio de logs
```bash
sudo mkdir -p /var/log/gunicorn
sudo chown -R www-data:www-data /var/log/gunicorn
```

#### Crear script de inicio
```bash
sudo nano /opt/agroproductores_risol/backend/start_gunicorn.sh
```

```bash
#!/bin/bash
cd /opt/agroproductores_risol/backend
source venv/bin/activate
exec gunicorn agroproductores_risol.wsgi:application -c gunicorn.conf.py
```

```bash
sudo chmod +x /opt/agroproductores_risol/backend/start_gunicorn.sh
```

### 6. Configuración de Supervisor

```bash
sudo nano /etc/supervisor/conf.d/agroproductores_risol.conf
```

```ini
[program:agroproductores_risol]
command=/opt/agroproductores_risol/backend/start_gunicorn.sh
directory=/opt/agroproductores_risol/backend
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/agroproductores_risol.log
stderr_logfile=/var/log/supervisor/agroproductores_risol_error.log
environment=PATH="/opt/agroproductores_risol/backend/venv/bin"
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start agroproductores_risol
```

### 7. Configuración de Nginx

```bash
sudo nano /etc/nginx/sites-available/agroproductores_risol
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    
    # Redireccionar HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;
    
    # Certificados SSL (configurar con Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    
    # Configuración SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Archivos estáticos
    location /static/ {
        alias /opt/agroproductores_risol/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /media/ {
        alias /opt/agroproductores_risol/backend/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # Proxy para la aplicación Django
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Configuración de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Logs
    access_log /var/log/nginx/agroproductores_risol_access.log;
    error_log /var/log/nginx/agroproductores_risol_error.log;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/agroproductores_risol /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🌐 Despliegue Frontend (React)

### 1. Preparación del Build

#### En tu máquina local
```bash
cd frontend

# Configurar variables de entorno para producción
echo "VITE_API_URL=https://tu-dominio.com" > .env.production

# Crear build de producción
npm run build
```

### 2. Subir archivos al servidor

```bash
# Comprimir archivos del build
tar -czf frontend-build.tar.gz dist/

# Subir al servidor (usando scp)
scp frontend-build.tar.gz usuario@tu-servidor:/tmp/

# En el servidor
cd /var/www
sudo mkdir -p agroproductores_risol
cd /tmp
sudo tar -xzf frontend-build.tar.gz -C /var/www/agroproductores_risol/
sudo chown -R www-data:www-data /var/www/agroproductores_risol/
```

### 3. Configuración de Nginx para Frontend

```bash
sudo nano /etc/nginx/sites-available/agroproductores_risol_frontend
```

```nginx
server {
    listen 80;
    server_name app.tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.tu-dominio.com;
    
    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/app.tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.tu-dominio.com/privkey.pem;
    
    root /var/www/agroproductores_risol/dist;
    index index.html;
    
    # Configuración para SPA (Single Page Application)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache para archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Proxy para API
    location /api/ {
        proxy_pass https://tu-dominio.com/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Logs
    access_log /var/log/nginx/frontend_access.log;
    error_log /var/log/nginx/frontend_error.log;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/agroproductores_risol_frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Configuración SSL con Let's Encrypt

### 1. Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtener certificados

```bash
# Para el backend
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Para el frontend
sudo certbot --nginx -d app.tu-dominio.com
```

### 3. Configurar renovación automática

```bash
sudo crontab -e
```

Agregar:
```bash
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoreo y Logs

### 1. Configurar logrotate

```bash
sudo nano /etc/logrotate.d/agroproductores_risol
```

```
/var/log/gunicorn/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        supervisorctl restart agroproductores_risol
    endscript
}

/var/log/nginx/*agroproductores_risol*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
```

### 2. Scripts de monitoreo

#### Script de backup de base de datos
```bash
sudo nano /opt/scripts/backup_db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="agroproductores_risol_prod"
DB_USER="agro_user"
DB_PASS="secure_password_here"

mkdir -p $BACKUP_DIR

mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Mantener solo los últimos 7 backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completado: backup_$DATE.sql"
```

```bash
sudo chmod +x /opt/scripts/backup_db.sh

# Programar backup diario
sudo crontab -e
```

Agregar:
```bash
0 2 * * * /opt/scripts/backup_db.sh
```

#### Script de monitoreo de salud
```bash
sudo nano /opt/scripts/health_check.sh
```

```bash
#!/bin/bash
API_URL="https://tu-dominio.com/api/token/"
FRONTEND_URL="https://app.tu-dominio.com"

# Verificar API
if curl -f -s $API_URL > /dev/null; then
    echo "$(date): API OK"
else
    echo "$(date): API ERROR" | mail -s "API Down" admin@tu-dominio.com
fi

# Verificar Frontend
if curl -f -s $FRONTEND_URL > /dev/null; then
    echo "$(date): Frontend OK"
else
    echo "$(date): Frontend ERROR" | mail -s "Frontend Down" admin@tu-dominio.com
fi
```

## 🔧 Comandos de Mantenimiento

### Backend
```bash
# Reiniciar aplicación
sudo supervisorctl restart agroproductores_risol

# Ver logs
sudo tail -f /var/log/supervisor/agroproductores_risol.log
sudo tail -f /var/log/gunicorn/agroproductores_risol.log

# Actualizar código
cd /opt/agroproductores_risol
sudo git pull origin main
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo supervisorctl restart agroproductores_risol
```

### Frontend
```bash
# Actualizar frontend
# (En local) npm run build
# Subir nuevos archivos al servidor
sudo rm -rf /var/www/agroproductores_risol/dist/*
# Extraer nuevos archivos
sudo systemctl reload nginx
```

### Base de datos
```bash
# Backup manual
mysqldump -u agro_user -p agroproductores_risol_prod > backup_manual.sql

# Restaurar backup
mysql -u agro_user -p agroproductores_risol_prod < backup_manual.sql
```

## 🚨 Solución de Problemas

### Problemas comunes

1. **Error 502 Bad Gateway**
   - Verificar que Gunicorn esté ejecutándose: `sudo supervisorctl status`
   - Revisar logs: `sudo tail -f /var/log/supervisor/agroproductores_risol.log`

2. **Archivos estáticos no cargan**
   - Ejecutar: `python manage.py collectstatic --noinput`
   - Verificar permisos: `sudo chown -R www-data:www-data /opt/agroproductores_risol/backend/staticfiles/`

3. **Error de base de datos**
   - Verificar conexión: `mysql -u agro_user -p`
   - Revisar configuración en `.env`

4. **Frontend no carga**
   - Verificar archivos en `/var/www/agroproductores_risol/dist/`
   - Revisar configuración de Nginx

### Logs importantes
```bash
# Logs de aplicación
sudo tail -f /var/log/supervisor/agroproductores_risol.log

# Logs de Nginx
sudo tail -f /var/log/nginx/agroproductores_risol_error.log

# Logs del sistema
sudo journalctl -u nginx -f
sudo journalctl -u supervisor -f
```

## 📋 Checklist de Despliegue

- [ ] Servidor configurado con todas las dependencias
- [ ] Base de datos MySQL configurada
- [ ] Variables de entorno configuradas
- [ ] Migraciones ejecutadas
- [ ] Archivos estáticos recopilados
- [ ] Gunicorn configurado y ejecutándose
- [ ] Supervisor configurado
- [ ] Nginx configurado
- [ ] SSL configurado con Let's Encrypt
- [ ] Frontend compilado y desplegado
- [ ] Backups automáticos configurados
- [ ] Monitoreo configurado
- [ ] Logs configurados
- [ ] Pruebas de funcionalidad realizadas

---

*Esta guía cubre el despliegue básico. Para entornos de alta disponibilidad, considerar configuraciones adicionales como balanceadores de carga, múltiples servidores y clustering de base de datos.*
