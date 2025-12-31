import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
django.setup()

from gestion_usuarios.models import Users

def create_audit_user():
    telefono = "1234567890"
    password = "testpassword123"
    
    if not Users.objects.filter(telefono=telefono).exists():
        print(f"Creating user {telefono}...")
        Users.objects.create_superuser(
            telefono=telefono,
            password=password,
            nombre="Audit",
            apellido="User"
        )
        print("User created.")
    else:
        print(f"User {telefono} already exists.")

if __name__ == "__main__":
    create_audit_user()
