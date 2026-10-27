# 🎵 Downtube

Buscador y descargador de música de YouTube en formato **MP3 (192 kbps)**.  
Aplicación web construida con **Python (Django 5.x)** y **yt-dlp** en el backend, y **HTML/CSS/JS moderno** en el frontend.

> ⚠️ **Uso responsable:** Esta herramienta es solo para fines educativos y de uso personal. Respeta los derechos de autor y los Términos de Servicio de YouTube. No descargues contenido sin los permisos correspondientes.

---

## 📸 Vista previa

| Página principal | Resultados de búsqueda |
|------------------|------------------------|
| Interfaz en modo oscuro, minimalista y responsiva | Tarjetas con miniatura, título, duración y botón de selección |

---

## ✨ Características

- 🔍 **Búsqueda en YouTube** con resultados en tiempo real
- 🎵 **Descarga y conversión** de audio a MP3 (192 kbps) mediante `yt-dlp` + FFmpeg
- 📛 **Nombres de archivo descriptivos:** los MP3 se guardan con el título real de YouTube (autor + canción)
- 💻 **Frontend moderno:** modo oscuro, diseño responsivo (móvil, tablet, laptop), animaciones suaves
- ⚡ **Feedback visual:** barra de progreso por etapas durante la descarga y conversión
- 🛡️ **Seguridad:** validación de URLs de YouTube, sanitización de nombres de archivo, prevención de path traversal
- 🧹 **Limpieza automática:** eliminación periódica de archivos antiguos en `media/` para evitar saturación de disco
- 🔌 **API RESTful** en JSON para integración con otros clientes

---

## 🚀 Inicio rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/downtube.git
cd downtube
```

### 2. Crear y activar el entorno virtual

```bash
# Linux / macOS
python -m venv workspace/.venv
source workspace/.venv/bin/activate

# Windows
python -m venv workspace\.venv
workspace\.venv\Scripts\activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

Copia el archivo de ejemplo y ajusta los valores:

```bash
cp workspace/.env.example workspace/.env
```

Edita `workspace/.env`:

```ini
DJANGO_SECRET_KEY=una-clave-secreta-muy-larga-y-aleatoria
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=*
```

> ⚠️ Nunca subas el archivo `.env` real a GitHub. Está incluido en `.gitignore`.

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

## 🔌 API RESTful

### Endpoints disponibles

| Método | Endpoint | Descripción | Cuerpo (JSON) |
|--------|----------|-------------|---------------|
| `GET` | `/` | Página principal (interfaz de búsqueda) | — |
| `POST` | `/api/search/` | Buscar música en YouTube | `{ "query": "nombre canción" }` |
| `POST` | `/api/download/` | Descargar y convertir a MP3 | `{ "url": "https://youtu.be/..." }` |
| `GET` | `/api/status/<task_id>/` | Consultar estado de una tarea | — |
| `GET` | `/download/<archivo>.mp3` | Descarga directa del archivo MP3 | — |

### Ejemplos con `curl`

**Buscar música:**
```bash
curl -X POST http://127.0.0.1:8000/api/search/ \
  -H "Content-Type: application/json" \
  -d '{"query": "rick astley never gonna give you up"}'
```

**Descargar MP3:**
```bash
curl -X POST http://127.0.0.1:8000/api/download/ \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Consultar estado:**
```bash
curl http://127.0.0.1:8000/api/status/<task_id>/
```

---

## 📁 Estructura del proyecto

```
downtube/
├── .agents/                     # Prompts de rol de los agentes (Orquestador, Backend, Frontend, QA)
├── .gitignore                   # Archivos ignorados por Git
├── orchestrator.py              # Script de orquestación del proyecto
├── requirements.txt             # Dependencias de Python
└── workspace/                   # Código fuente de la aplicación
    ├── .env.example             # Ejemplo de variables de entorno
    ├── .env                     # Variables de entorno (no se sube a GitHub)
    ├── manage.py                # CLI de Django
    ├── db.sqlite3               # Base de datos SQLite (no se sube a GitHub)
    ├── README.md                # Documentación técnica detallada
    ├── downtube_project/        # Configuración Django
    │   ├── settings.py
    │   ├── urls.py
    │   ├── wsgi.py
    │   └── asgi.py
    ├── core/                    # App principal
    │   ├── __init__.py
    │   ├── admin.py
    │   ├── apps.py
    │   ├── models.py            # DownloadTask (registro de tareas)
    │   ├── views.py             # Endpoints API
    │   ├── services.py          # YtDlpService (integración con yt-dlp)
    │   ├── urls.py              # Rutas de la app
    │   ├── migrations/
    │   └── tests.py
    ├── static/
    │   ├── css/
    │   │   └── style.css        # Estilos modo oscuro minimalista
    │   └── js/
    │       └── app.js           # Lógica Fetch API y UI
    ├── templates/
    │   └── core/
    │       └── index.html       # Interfaz principal
    └── media/                   # Archivos MP3 generados (no se sube a GitHub)
```

---

## 🔒 Seguridad y consideraciones legales

- **Solo URLs de YouTube:** el backend valida que las URLs provengan de dominios de YouTube (`youtube.com`, `youtu.be`, etc.).
- **Sanitización de archivos:** los nombres de archivo se limpian para prevenir ataques de path traversal.
- **Variables de entorno:** las claves secretas se manejan mediante `.env` y nunca se suben al repositorio.
- **Derechos de autor:** esta herramienta es para uso educativo y personal. El usuario es responsable de cumplir con las leyes de propiedad intelectual y los Términos de Servicio de YouTube.

---

## 🛠️ Requisitos previos

- Python 3.10 o superior
- **FFmpeg** instalado en el sistema (requerido por `yt-dlp` para extraer audio)
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Windows: descargar desde https://ffmpeg.org/

---

## 🤝 Contribución

Las contribuciones son bienvenidas. Para contribuir:

1. Haz un **fork** del repositorio
2. Crea una rama: `git checkout -b feature/nombre-de-tu-feature`
3. Realiza tus cambios y haz commit: `git commit -m "feat: descripción del cambio"`
4. Sube tus cambios: `git push origin feature/nombre-de-tu-feature`
5. Abre un **Pull Request**

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.

---

## 👨‍💻 Autor

Creado con ❤️ como proyecto educativo de orquestación de agentes de IA.

---

## ⚠️ Aviso importante antes de subir a GitHub

Este repositorio será **público**. Asegúrate de:

1. ✅ No incluir el archivo `.env` real (está en `.gitignore`)
2. ✅ No incluir la carpeta `.venv/` (está en `.gitignore`)
3. ✅ No incluir `db.sqlite3` (está en `.gitignore`)
4. ✅ No incluir archivos MP3 generados en `media/` (está en `.gitignore`)
5. ✅ Revisar que no haya credenciales hardcodeadas en el código

---

## 📞 Soporte

Si tienes preguntas o encuentras un problema, abre un **Issue** en este repositorio.
