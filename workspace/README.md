# Downtube - Buscador y Descargador de MP3 desde YouTube

Aplicación web para buscar y descargar audio de YouTube en formato MP3 (192 kbps) utilizando **Python (Django 5.x)** y **yt-dlp** en el backend, con HTML/CSS/JS moderno en el frontend.

---

## 🚀 Características

- Búsqueda de música en YouTube con resultados en tiempo real.
- Descarga y conversión de audio a MP3 (192 kbps) mediante `yt-dlp` + FFmpeg.
- Los archivos MP3 se nombran con el título real de YouTube (autor + canción), seguido de un sufijo corto único para evitar colisiones (ejemplo: `Rick Astley - Never Gonna Give You Up_a1b2c3d4.mp3`).
- Interfaz moderna en modo oscuro, 100% responsiva (móvil, tablet, laptop).
- Feedback visual durante la descarga con barra de progreso por etapas.
- Gestión robusta de errores (videos con restricción de edad, transmisiones en vivo, errores de red, URLs inválidas).
- Limpieza automática de archivos temporales y antiguos en `media/` (hilo daemon cada hora).
- Sanitización de nombres de archivo y validación de entradas (prevención de path traversal).
- Endpoints API RESTful en JSON.

---

## 📋 Requisitos previos

- Python 3.10 o superior.
- **FFmpeg** instalado en el sistema (requerido por `yt-dlp` para extraer audio).
- Acceso a internet para consultar YouTube.

---

## ⚙️ Instalación

### 1. Clonar o ubicarse en el proyecto
```bash
cd /ruta/al/proyecto/downtube
```

### 2. Crear y activar el entorno virtual
```bash
python -m venv workspace/.venv

# Linux / macOS
source workspace/.venv/bin/activate

# Windows
workspace\.venv\Scripts\activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno
Copiar el archivo de ejemplo y ajustar si es necesario:
```bash
cp workspace/.env.example workspace/.env  # si existe
# O editar directamente workspace/.env
```

El archivo `workspace/.env` incluye:
```
DJANGO_SECRET_KEY=tu-clave-secreta
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=*
```

### 5. Aplicar migraciones de base de datos
```bash
cd workspace
python manage.py makemigrations core
python manage.py migrate
```

### 6. Ejecutar el servidor
```bash
python manage.py runserver
```

La aplicación estará disponible en: `http://127.0.0.1:8000/`

---

## 🔌 Endpoints disponibles

| Método | Endpoint | Descripción | Cuerpo (JSON) |
|--------|----------|-------------|---------------|
| `GET` | `/` | Página principal (interfaz de búsqueda) | — |
| `POST` | `/api/search/` | Buscar música en YouTube | `{ "query": "nombre canción" }` |
| `POST` | `/api/download/` | Descargar y convertir a MP3 | `{ "url": "https://youtu.be/..." }` |
| `GET` | `/api/status/<task_id>/` | Consultar estado de una tarea | — |
| `GET` | `/download/<archivo>.mp3` | Descarga directa del archivo MP3 | — |

### Ejemplo de búsqueda
```bash
curl -X POST http://127.0.0.1:8000/api/search/ \
  -H "Content-Type: application/json" \
  -d '{"query": "shape of you"}'
```

### Ejemplo de descarga
```bash
curl -X POST http://127.0.0.1:8000/api/download/ \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

---

## 🧹 Limpieza automática

El sistema incluye un hilo daemon que se ejecuta cada hora y elimina archivos MP3 en `workspace/media/` más antiguos de 24 horas, evitando la saturación del disco.

También se limpian los archivos temporales intermedios inmediatamente después de cada descarga exitosa, conservando únicamente el MP3 final.

---

## 🔒 Seguridad

- Validación de que las URLs provengan de dominios de YouTube (`youtube.com`, `youtu.be`, etc.).
- Sanitización de nombres de archivo para prevenir path traversal.
- Validación de longitud máxima en consultas de búsqueda.
- Verificación de rutas resueltas en `MEDIA_ROOT` antes de servir archivos.

---

## ⚠️ Advertencia legal

Esta herramienta es solo para fines educativos y de uso personal. Respeta los derechos de autor y los Términos de Servicio de YouTube. No descargues contenido sin los permisos correspondientes.

---

## 🛠️ Estructura del proyecto

```
downtube/
├── .agents/                      # Prompts de rol de los agentes
│   ├── orchestrator_prompt.txt
│   ├── backend_prompt.txt
│   ├── frontend_prompt.txt
│   └── tester_prompt.txt
├── workspace/                    # Código generado
│   ├── .venv/                    # Entorno virtual Python
│   ├── .env                      # Variables de entorno
│   ├── db.sqlite3                # Base de datos SQLite
│   ├── manage.py
│   ├── requirements.txt
│   ├── README.md
│   ├── downtube_project/         # Configuración Django
│   ├── core/                     # App principal
│   │   ├── models.py             # DownloadTask
│   │   ├── views.py              # Endpoints API
│   │   ├── services.py           # YtDlpService
│   │   ├── urls.py               # Rutas
│   │   └── migrations/
│   ├── templates/core/
│   │   └── index.html            # Interfaz principal
│   ├── static/
│   │   ├── css/style.css         # Estilos modo oscuro
│   │   └── js/app.js             # Lógica Fetch API
│   └── media/                    # Archivos MP3 generados
├── orchestrator.py               # Script de orquestación
└── requirements.txt
```

---

## 📞 Soporte

Para reportar problemas o sugerencias, contactar al Orquestador Principal del proyecto Downtube.
