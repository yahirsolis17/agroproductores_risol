import os
import re
import sys

def check_response_usage(backend_root):
    """
    Escanea views de Django buscando uso directo de Response() o HttpResponse()
    fuera de las excepciones permitidas (reportes, utils).
    """
    print(f"🔍 Auditando uso de Response raw en: {backend_root}")
    
    # Patrones prohibidos (simplificados)
    # Buscamos 'return Response(' o 'return HttpResponse('
    # No es un parser AST completo, pero sirve de smoke test rápido.
    forbidden_patterns = [
        re.compile(r'return\s+Response\s*\('),
        re.compile(r'return\s+HttpResponse\s*\('),
        re.compile(r'return\s+JsonResponse\s*\('),
    ]

    # Archivos/Directorios excluidos (Excepciones formales del Canon)
    excludes = [
        r'reportes',        # Binarios (PDF/Excel) usan HttpResponse
        r'utils',           # Helpers pueden usarlos internamente
        r'migrations',
        r'tests',
        r'venv',
        r'__pycache__',
        r'manage.py',
    ]
    
    violations = []

    for root, dirs, files in os.walk(backend_root):
        # Filtrar directorios excluidos
        dirs[:] = [d for d in dirs if not any(exc in os.path.join(root, d) for exc in excludes)]
        
        for file in files:
            if not file.endswith('.py'):
                continue
                
            full_path = os.path.join(root, file)
            
            # Doble check de exclusiones por path completo
            if any(exc in full_path for exc in excludes):
                continue
                
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    for i, line in enumerate(lines):
                        for pattern in forbidden_patterns:
                            if pattern.search(line):
                                # Verificar que no sea un comentario
                                if line.strip().startswith('#'):
                                    continue
                                    
                                violations.append({
                                    'file': full_path,
                                    'line': i + 1,
                                    'content': line.strip()
                                })
            except Exception as e:
                print(f"⚠ Error leyendo {full_path}: {e}")

    if violations:
        print("\n❌ Violaciones al Canon detectadas (Response crudo en endpoints JSON):")
        for v in violations:
            print(f"   📄 {v['file']}:{v['line']}")
            print(f"      Code: {v['content']}")
        print("\nFix: Use NotificationHandler.generate_response(...) o mueva el archivo a una carpeta de excepciones válida.")
        sys.exit(1)
    else:
        print("✅ Canon Check Passed: No se detectaron Responses crudos ilegales.")
        sys.exit(0)

if __name__ == "__main__":
    # Ajusta ruta relative a donde se corre (root del repo o backend)
    # Asumimos que se corre desde root o backend, buscamos 'backend' dir
    target_dir = 'backend' if os.path.isdir('backend') else '.'
    check_response_usage(target_dir)
