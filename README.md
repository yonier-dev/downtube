# 🎵 Downtube

Buscador y descargador de música de YouTube en formato **MP3 (192 kbps)**.  
Un proyecto personal construido con **Python (Django)** y **yt-dlp** en el backend, y **HTML/CSS/JS moderno** en el frontend.

> Hecho con ❤️ por **Yonier**.  
> ⚠️ Solo para fines educativos y uso personal. Respeta los derechos de autor y los Términos de Servicio de YouTube.

---

## 📸 ¿Qué hace esta app?

Busca canciones en YouTube, las descarga y las convierte a MP3 automáticamente. Todo desde una interfaz sencilla, oscura y responsiva que funciona en celular, tablet y computadora.

| Página principal | Resultados de búsqueda |
|------------------|------------------------|
| Modo oscuro, minimalista | Tarjetas con miniatura, título, duración y botón para descargar |

---

## ✨ Características

- 🔍 Busca música en YouTube y muestra resultados al instante
- 🎵 Descarga el audio y lo convierte a MP3 (192 kbps) con `yt-dlp` + FFmpeg
- 📛 Los archivos se guardan con el nombre real de la canción (autor + título)
- 💻 Interfaz moderna en modo oscuro, 100% responsiva
- ⚡ Barra de progreso mientras se descarga y convierte el audio
- 🛡️ Valida que solo se procesen enlaces de YouTube
- 🧹 Limpia automáticamente los archivos viejos para no llenar el disco
- 🔌 API RESTful en JSON por si quieres integrarlo en otro proyecto

---

## 🚀 Cómo ponerlo en marcha

### 1. Clona el repositorio

```bash
git clone https://github.com/yonier-dev/downtube.git
cd downtube
```

### 2. Crea y activa el entorno virtual

```bash
# Linux / macOS
python -m venv workspace/.venv
source workspace/.venv/bin/activate

# Windows
python -m venv workspace\.venv
workspace\.venv\Scripts\activate
```

### 3. Instala las dependencias

```bash
pip install -r requirements.txt
```

### 4. Configura tus variables de entorno

Copia el archivo de ejemplo:

```bash
cp workspace/.env.example workspace/.env
```

Luego edita `workspace/.env` con tus datos:

```ini
DJANGO_SECRET_KEY=tu-clave-secreta-aqui
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=*
```

> 🔐 Nunca subas tu `.env` real a GitHub. Está ignorado por `.gitignore`.

### 5. Prepara la base de datos

```bash
cd workspace
python manage.py makemigrations core
python manage.py migrate
```

### 6. Inicia el servidor

```bash
python manage.py runserver
```

Listo! Abre tu navegador en: `http://127.0.0.1:8000/`

---

## 🔌 API (por si quieres usarla desde otro lado)

| Método | Endpoint | ¿Qué hace? |
|--------|----------|------------|
| `GET` | `/` | Página principal |
| `POST` | `/api/search/` | Buscar música (`{"query": "..."}`) |
| `POST` | `/api/download/` | Descargar MP3 (`{"url": "https://youtu.be/..."}`) |
| `GET` | `/api/status/<id>/` | Ver estado de una descarga |
| `GET` | `/download/<archivo>.mp3` | Descargar el archivo directamente |

---

## 📁 Estructura del proyecto

```
downtube/
├── .agents/              # Prompts de los agentes de IA que me ayudaron a organizar esto
├── .gitignore            # Archivos que no subo a GitHub
├── README.md             # Este archivo
├── orchestrator.py       # Script de coordinación
├── requirements.txt      # Dependencias de Python
└── workspace/            # Código de la aplicación
    ├── .env.example      # Ejemplo de variables de entorno
    ├── .env              # Tus variables (no se sube)
    ├── manage.py
    ├── db.sqlite3        # Base de datos local (no se sube)
    ├── downtube_project/ # Configuración de Django
    ├── core/             # La app principal
    │   ├── models.py     # Modelo de tareas de descarga
    │   ├── views.py      # Endpoints de la API
    │   ├── services.py   # Lógica con yt-dlp
    │   ├── urls.py       # Rutas
    │   └── migrations/
    ├── static/
    │   ├── css/style.css     # Estilos (modo oscuro)
    │   └── js/app.js         # Lógica del frontend
    ├── templates/
    │   └── core/index.html   # Interfaz principal
    └── media/          # MP3s generados (no se sube)
```

---

## ⚠️ Requisitos

- Python 3.10+
- **FFmpeg** instalado (necesario para que yt-dlp extraiga audio)
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Windows: https://ffmpeg.org/

---

## ⚖️ Aviso legal

Este es un proyecto personal y educativo. No me hago responsable del mal uso.  
Descargar contenido de YouTube puede violar sus Términos de Servicio y los derechos de autor. Úsalo bajo tu propia responsabilidad y solo con contenido que tengas permiso para descargar.

---

## 🙌 Créditos

Proyecto creado por **Yonier** como práctica de desarrollo con Django, yt-dlp y JavaScript moderno.

Si te sirve, dale una ⭐ en GitHub o compártelo con quien pueda necesitarlo.
