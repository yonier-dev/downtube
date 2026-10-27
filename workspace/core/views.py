import json
import os
import uuid
import logging
from django.http import JsonResponse, FileResponse, Http404
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings

from .models import DownloadTask
from .services import YtDlpService

logger = logging.getLogger(__name__)

# Instancia singleton del servicio
yt_service = YtDlpService()

MAX_QUERY_LENGTH = 200


def _sanitize_file_name(file_name: str) -> str:
    """
    Evita path traversal asegurando que el nombre sea solo un archivo
    sin componentes de ruta.
    """
    base = os.path.basename(file_name)
    if base != file_name or '..' in base or base.startswith('/') or base.startswith('\\'):
        raise Http404("Nombre de archivo no válido")
    return base


def home(request):
    """Vista principal: renderiza la página de búsqueda y descarga."""
    return render(request, 'core/index.html')


@csrf_exempt
@require_http_methods(['POST'])
def search_music(request):
    """
    Endpoint de búsqueda de música.
    Cuerpo esperado (JSON): { "query": "nombre de canción o artista" }
    """
    try:
        data = json.loads(request.body)
        query = data.get('query', '').strip()

        if not query:
            return JsonResponse({'error': 'Query vacío'}, status=400)

        if len(query) > MAX_QUERY_LENGTH:
            return JsonResponse({'error': 'Query demasiado largo'}, status=400)

        results = yt_service.search(query)
        return JsonResponse({'results': results, 'count': len(results)})

    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except RuntimeError as e:
        return JsonResponse({'error': str(e)}, status=502)
    except Exception as e:
        logger.exception("Error inesperado en búsqueda")
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


@csrf_exempt
@require_http_methods(['POST'])
def search_music_filtered(request):
    """
    Endpoint de búsqueda con filtros de duración.
    Cuerpo esperado (JSON): {
        "query": "nombre canción",
        "min_duration": 60,      # opcional, en segundos
        "max_duration": 600      # opcional, en segundos
    }
    """
    try:
        data = json.loads(request.body)
        query = data.get('query', '').strip()

        if not query:
            return JsonResponse({'error': 'Query vacío'}, status=400)

        if len(query) > MAX_QUERY_LENGTH:
            return JsonResponse({'error': 'Query demasiado largo'}, status=400)

        min_duration = data.get('min_duration')
        max_duration = data.get('max_duration')

        if min_duration is not None:
            try:
                min_duration = int(min_duration)
                if min_duration < 0:
                    raise ValueError
            except (ValueError, TypeError):
                return JsonResponse({'error': 'min_duration debe ser un número positivo'}, status=400)

        if max_duration is not None:
            try:
                max_duration = int(max_duration)
                if max_duration < 0:
                    raise ValueError
            except (ValueError, TypeError):
                return JsonResponse({'error': 'max_duration debe ser un número positivo'}, status=400)

        results = yt_service.search_with_filters(
            query, min_duration=min_duration, max_duration=max_duration
        )
        return JsonResponse({'results': results, 'count': len(results)})

    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except RuntimeError as e:
        return JsonResponse({'error': str(e)}, status=502)
    except Exception as e:
        logger.exception("Error inesperado en búsqueda filtrada")
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


@csrf_exempt
@require_http_methods(['POST'])
def download_music(request):
    """
    Endpoint de descarga de audio o video.
    Cuerpo esperado (JSON): {
        "url": "https://www.youtube.com/watch?v=...",
        "format": "mp3",      # opcional: 'mp3' o 'mp4', default 'mp3'
        "quality": "192"      # opcional: mp3 -> '128'|'192'|'320'; mp4 -> '360'|'480'|'720'|'1080'
    }
    """
    try:
        data = json.loads(request.body)
        url = data.get('url', '').strip()
        fmt = data.get('format', 'mp3').strip().lower()
        quality = data.get('quality', '192').strip()

        if not url:
            return JsonResponse({'error': 'URL vacía'}, status=400)

        if fmt not in ('mp3', 'mp4'):
            return JsonResponse({'error': "Formato no válido. Usa 'mp3' o 'mp4'."}, status=400)

        if not yt_service._is_youtube_url(url):
            return JsonResponse({'error': 'URL no válida de YouTube'}, status=400)

        task_id = str(uuid.uuid4())

        # Obtener información del video antes de descargar
        try:
            info = yt_service.get_video_info(url)
        except RuntimeError as e:
            return JsonResponse({'error': str(e), 'task_id': task_id}, status=502)
        except Exception as e:
            logger.exception("Error obteniendo info del video")
            return JsonResponse(
                {'error': 'No se pudo obtener información del video', 'task_id': task_id},
                status=500,
            )

        # Crear registro de tarea
        task = DownloadTask.objects.create(
            task_id=task_id,
            query=url,
            video_url=url,
            title=info.get('title', ''),
            status='processing',
        )

        # Descargar audio o video según el formato solicitado
        try:
            result = yt_service.download_media(url, task_id, fmt=fmt, quality=quality)

            task.title = result.get('title', task.title)
            task.file_path = result.get('file_path', '')
            task.file_size = result.get('file_size', 0)
            task.status = 'completed'
            task.save()

            return JsonResponse({
                'task_id': task_id,
                'status': 'completed',
                'title': result.get('title', ''),
                'format': result.get('format', fmt),
                'quality': result.get('quality', quality),
                'file_name': result.get('file_name', ''),
                'file_size': result.get('file_size', 0),
                'download_url': f'{settings.MEDIA_URL}{result.get("file_name", "")}',
            })

        except RuntimeError as e:
            task.status = 'failed'
            task.save()
            return JsonResponse({'error': str(e), 'task_id': task_id}, status=502)
        except FileNotFoundError as e:
            task.status = 'failed'
            task.save()
            return JsonResponse({'error': str(e), 'task_id': task_id}, status=500)
        except Exception as e:
            task.status = 'failed'
            task.save()
            logger.exception("Error inesperado en descarga")
            return JsonResponse({'error': 'Error interno del servidor', 'task_id': task_id}, status=500)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        logger.exception("Error inesperado en endpoint de descarga")
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


@require_http_methods(['GET'])
def download_status(request, task_id):
    """
    Consultar el estado de una tarea de descarga.
    """
    try:
        task = DownloadTask.objects.get(task_id=task_id)
    except DownloadTask.DoesNotExist:
        return JsonResponse({'error': 'Tarea no encontrada'}, status=404)

    file_name = os.path.basename(task.file_path) if task.file_path else None
    return JsonResponse({
        'task_id': task.task_id,
        'status': task.status,
        'title': task.title,
        'file_name': file_name,
        'file_size': task.file_size,
        'download_url': f'{settings.MEDIA_URL}{file_name}' if file_name else None,
        'created_at': task.created_at.isoformat(),
        'updated_at': task.updated_at.isoformat(),
    })


@require_http_methods(['GET'])
def serve_download(request, file_name):
    """
    Sirve el archivo MP3 descargado para descarga directa.
    """
    try:
        safe_name = _sanitize_file_name(file_name)
    except Http404:
        raise Http404('Nombre de archivo no válido')

    file_path = os.path.join(settings.MEDIA_ROOT, safe_name)
    if not os.path.exists(file_path):
        raise Http404('Archivo no encontrado')

    # Verificación adicional: asegurar que el path resuelto esté dentro de MEDIA_ROOT
    real_media = os.path.realpath(settings.MEDIA_ROOT)
    real_file = os.path.realpath(file_path)
    if not (real_file == real_media or real_file.startswith(real_media + os.sep)):
        raise Http404('Acceso denegado')

    response = FileResponse(
        open(file_path, 'rb'),
        as_attachment=True,
        filename=safe_name,
    )
    response['Content-Type'] = 'audio/mpeg'
    return response


@require_http_methods(['GET', 'HEAD'])
def health_check(request):
    """Endpoint de salud para verificar que el servidor responde (Android connectivity check)."""
    return JsonResponse({'status': 'ok'})


@csrf_exempt
@require_http_methods(['POST'])
def import_spotify_playlist(request):
    """
    Importar una playlist pública de Spotify.
    Cuerpo esperado (JSON): { "url": "https://open.spotify.com/playlist/..." }
    """
    if spotify_service is None:
        return JsonResponse({
            'error': 'Spotify no configurado. Agrega SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en .env'
        }, status=503)

    try:
        data = json.loads(request.body)
        url = data.get('url', '').strip()

        if not url:
            return JsonResponse({'error': 'URL vacía'}, status=400)

        result = spotify_service.get_playlist_tracks(url)
        return JsonResponse(result)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except RuntimeError as e:
        return JsonResponse({'error': str(e)}, status=502)
    except Exception as e:
        logger.exception("Error inesperado importando playlist de Spotify")
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


@csrf_exempt
@require_http_methods(['POST'])
def import_spotify_playlist(request):
    """
    Importar una playlist pública de Spotify.
    Cuerpo esperado (JSON): { "url": "https://open.spotify.com/playlist/..." }
    """
    if spotify_service is None:
        return JsonResponse({
            'error': 'Spotify no configurado. Agrega SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en .env'
        }, status=503)

    try:
        data = json.loads(request.body)
        url = data.get('url', '').strip()

        if not url:
            return JsonResponse({'error': 'URL vacía'}, status=400)

        result = spotify_service.get_playlist_tracks(url)
        return JsonResponse(result)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except RuntimeError as e:
        return JsonResponse({'error': str(e)}, status=502)
    except Exception as e:
        logger.exception("Error inesperado importando playlist de Spotify")
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)
