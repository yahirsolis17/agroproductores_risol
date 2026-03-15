# Agroproductores Risol

> Nota 2026-03-15: parte de la documentación de auditoría conserva referencias históricas a scripts Python standalone eliminados en el commit `033cd61`. Úsala como contexto técnico, no como inventario actual de comandos ejecutables.

Sistema de gestión para Agroproductores Risol.

## 🏗️ System Canon (Arquitectura y Estándares)

Este proyecto sigue una arquitectura estricta ("System Canon") protegida por CI/CD.
Antes de contribuir, **es obligatorio leer el contrato del sistema**:

👉 **[System Canon Smoke Pack (Docs)](./SMOKE_PACK.md)**

Cualquier cambio que viole este contrato (e.g., `any` en core, `return Response()` crudo, `page_size` hardcodeado) causará un fallo automático en el pipeline de Integración Continua.

## 🚀 Quick Start

### Backend (Django)
```bash
cd backend
pip install -r requirements.txt
python manage.py runserver
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

## ✅ CI/CD Gates
El repositorio cuenta con gates automatizados en GitHub Actions:
- **Frontend**: Typecheck, Lint, Build.
- **Backend**: Django Check.
- **Guardrails**: `check_response_canon.py`, `check_message_keys_canon.py`.
