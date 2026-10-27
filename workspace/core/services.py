import os
import re
import uuid
import logging
import threading
import time
from datetime import datetime, timedelta

import yt_dlp
from django.conf import settings

logger = logging.getLogger(__name__)

from .models import DownloadTask


class YtDlpService:
    """Servicio de integración con yt-dlp para buscar y extraer audio MP3 de YouTube."""

    YOUTUBE_DOMAINS = ('youtube.com', 'youtu.be', 'm.youtube.com', 'www.youtube.com')

    def __init__(self, cleanup_interval_seconds=3600, max_file_age_hours=24):
        self.download_dir = settings.MEDIA_ROOT
        os.makedirs(self.download_dir, exist_ok=True)
        self.cleanup_interval_seconds = cleanup_interval_seconds
        self.max_file_age_hours = max_file_age_hours
        self._start_background_cleanup()

    def _start_background_cleanup(self):
        """Inicia un hilo daemon que limpia archivos antiguos periódicamente."""

        def _cleanup_loop():
            while True:
                time.sleep(self.cleanup_interval_seconds)
                try:
                    self.cleanup_old_files(self.max_file_age_hours)
                except Exception as e:
                    logger.error(f"Error en limpieza automática: {e}")

        cleanup_thread = threading.Thread(target=_cleanup_loop, daemon=True)
        cleanup_thread.start()

    @staticmethod
    def _is_youtube_url(url: str) -> bool:
        """Valida que la URL pertenezca a YouTube."""
        if not url:
            return False
        return any(domain in url for domain in YtDlpService.YOUTUBE_DOMAINS)

    @staticmethod
    def _sanitize_filename(name: str) -> str:
        """Sanitiza un nombre de archivo para prevenir path traversal y caracteres peligrosos."""
        if not name:
            return 'archivo'
        # Mantener solo alfanuméricos, espacios, guiones, guiones bajos y puntos
        safe = re.sub(r'[^\w\s\-\.]', '', name)
        # Eliminar puntos y barras al inicio para prevenir path traversal
        safe = safe.strip('. /\\')
        # Colapsar múltiples espacios
        safe = re.sub(r'\s+', ' ', safe).strip()
        # Limitar longitud para dejar espacio al sufijo único
        return safe[:80] if safe else 'archivo'

    @classmethod
    def _generate_unique_filename(cls, title: str, task_id: str) -> str:
        """
        Genera un nombre de archivo único basado en el título de YouTube
        (autor + canción) más un sufijo corto del task_id para evitar colisiones.
        Ejemplo: 'Rick Astley - Never Gonna Give You Up_a1b2c3d4.mp3'
        """
        safe_title = cls._sanitize_filename(title)
        short_id = str(task_id).replace('-', '')[:8]
        return f'{safe_title}_{short_id}.mp3'

    def search(self, query: str, max_results: int = 10) -> list[dict]:
        """
        Busca videos en YouTube coincidiendo con la consulta.
        Devuelve una lista de diccionarios con id, título, duración y miniatura.
        """
        if not query or not query.strip():
            return []

        query = query.strip()
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
            'default_search': 'ytsearch',
            'playlistend': max_results,
        }

        results = []
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                search_url = f'ytsearch{max_results}:{query}'
                info = ydl.extract_info(search_url, download=False)
                entries = info.get('entries', []) or []

                for entry in entries:
                    if not entry:
                        continue
                    results.append({
                        'id': entry.get('id', ''),
                        'title': entry.get('title', '') or 'Sin título',
                        'url': entry.get('url', ''),
                        'duration': entry.get('duration', 0) or 0,
                        'thumbnail': entry.get('thumbnail', ''),
                    })
        except Exception as e:
            logger.error(f"Error en búsqueda de yt-dlp: {e}")
            raise RuntimeError(f"Error al buscar en YouTube: {str(e)}")

        return results

    def search_with_filters(self, query: str, min_duration: int = None,
                           max_duration: int = None, max_results: int = 10) -> list[dict]:
        """
        Busca videos en YouTube con filtros opcionales de duración.
        """
        if not query or not query.strip():
            return []

        query = query.strip()
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
            'default_search': 'ytsearch',
            'playlistend': max_results,
        }

        results = []
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                search_url = f'ytsearch{max_results}:{query}'
                info = ydl.extract_info(search_url, download=False)
                entries = info.get('entries', []) or []

                for entry in entries:
                    if not entry:
                        continue
                    duration = entry.get('duration', 0) or 0

                    # Aplicar filtros de duración
                    if min_duration is not None and duration < min_duration:
                        continue
                    if max_duration is not None and duration > max_duration:
                        continue

                    results.append({
                        'id': entry.get('id', ''),
                        'title': entry.get('title', '') or 'Sin título',
                        'url': entry.get('url', ''),
                        'duration': duration,
                        'thumbnail': entry.get('thumbnail', ''),
                    })
        except Exception as e:
            logger.error(f"Error en búsqueda con filtros: {e}")
            raise RuntimeError(f"Error al buscar en YouTube: {str(e)}")

        return results

    def get_video_info(self, url: str) -> dict:
        """
        Obtiene información detallada de un video sin descargarlo.
        """
        if not self._is_youtube_url(url):
            raise ValueError("La URL no es un enlace válido de YouTube")

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
        except Exception as e:
            logger.error(f"Error obteniendo info del video: {e}")
            raise RuntimeError(f"No se pudo obtener información del video: {str(e)}")

        return {
            'id': info.get('id', ''),
            'title': info.get('title', '') or 'Sin título',
            'duration': info.get('duration', 0) or 0,
            'thumbnail': info.get('thumbnail', ''),
            'uploader': info.get('uploader', '') or 'Desconocido',
            'view_count': info.get('view_count', 0) or 0,
        }

    def download_media(self, url: str, task_id: str, fmt: str = 'mp3', quality: str = '192') -> dict:
        """
        Descarga el audio o video de un video de YouTube.
        fmt: 'mp3' o 'mp4'
        quality: para mp3 -> '128', '192', '320' (kbps); para mp4 -> '360', '480', '720', '1080' (pixeles de altura)
        El archivo se nombra con el título del video (autor + canción) más
        un sufijo corto único para evitar colisiones.
        Devuelve un diccionario con la ruta del archivo, tamaño y metadatos.
        """
        if not self._is_youtube_url(url):
            raise ValueError("La URL no es un enlace válido de YouTube")

        # Obtener información del video para usar el título como nombre de archivo
        try:
            info = self.get_video_info(url)
        except Exception:
            info = {}

        video_title = info.get('title', '') or 'video_youtube'
        safe_task_id = self._sanitize_filename(task_id)

        # Extensión y nombre de archivo según el formato
        ext = 'mp3' if fmt == 'mp3' else 'mp4'
        final_filename = f'{self._sanitize_filename(video_title)}_{str(task_id).replace("-", "")[:8]}.{ext}'
        final_path = os.path.join(self.download_dir, final_filename)

        # Plantilla de salida temporal
        output_template = os.path.join(self.download_dir, f'{safe_task_id}.%(ext)s')

        if fmt == 'mp3':
            # Calidades de audio soportadas
            audio_quality = quality if quality in ('128', '192', '320') else '192'
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': output_template,
                'quiet': True,
                'no_warnings': True,
                'postprocessors': [
                    {
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': audio_quality,
                    },
                ],
            }
        else:
            # Calidades de video soportadas (altura máxima en píxeles)
            video_quality = quality if quality in ('360', '480', '720', '1080') else '720'
            ydl_opts = {
                'format': f'bestvideo[height<={video_quality}]+bestaudio/best[height<={video_quality}]/best',
                'outtmpl': output_template,
                'quiet': True,
                'no_warnings': True,
                'merge_output_format': 'mp4',
            }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
        except yt_dlp.utils.DownloadError as e:
            error_msg = str(e).lower()
            if 'age' in error_msg or '18+' in error_msg:
                raise RuntimeError("Este video tiene restricción de edad y no se puede descargar.")
            if 'live' in error_msg:
                raise RuntimeError("Las transmisiones en vivo no se pueden descargar.")
            if 'network' in error_msg or 'unavailable' in error_msg or 'private' in error_msg:
                raise RuntimeError("Error de red o video no disponible / privado.")
            raise RuntimeError(f"Error al descargar el video: {str(e)}")
        except Exception as e:
            logger.error(f"Error inesperado en descarga: {e}")
            raise RuntimeError(f"Error inesperado al descargar: {str(e)}")

        # Localizar el archivo generado por yt-dlp
        actual_path = None
        for fname in os.listdir(self.download_dir):
            if fname.startswith(safe_task_id) and fname.endswith(f'.{ext}'):
                actual_path = os.path.join(self.download_dir, fname)
                break

        if not actual_path or not os.path.exists(actual_path):
            raise FileNotFoundError(f"No se pudo localizar el archivo {ext.upper()} generado.")

        # Renombrar al nombre final basado en el título de YouTube
        if actual_path != final_path:
            if os.path.exists(final_path):
                try:
                    os.remove(final_path)
                except OSError:
                    pass
            os.rename(actual_path, final_path)

        file_size = os.path.getsize(final_path)

        # Limpiar archivos temporales intermedios, conservando el archivo final
        self.cleanup_temp_files(safe_task_id, keep_final=True)

        # Usar el título real del video obtenido tras la descarga si está disponible
        final_title = info.get('title', video_title)

        return {
            'task_id': task_id,
            'title': final_title,
            'format': fmt,
            'quality': quality,
            'file_path': final_path,
            'file_name': final_filename,
            'file_size': file_size,
            'duration': info.get('duration', 0) or 0,
            'thumbnail': info.get('thumbnail', ''),
            'status': 'completed',
        }

    def cleanup_temp_files(self, task_id: str, keep_final: bool = False) -> None:
        """
        Elimina archivos temporales asociados a una tarea tras la descarga.
        Si keep_final=True, conserva el archivo .mp3 final.
        """
        safe_task_id = self._sanitize_filename(task_id)
        for fname in os.listdir(self.download_dir):
            if fname.startswith(safe_task_id):
                if keep_final and fname.endswith('.mp3'):
                    continue
                fpath = os.path.join(self.download_dir, fname)
                try:
                    if os.path.isfile(fpath):
                        os.remove(fpath)
                        logger.info(f"Archivo temporal eliminado: {fpath}")
                except OSError as e:
                    logger.warning(f"No se pudo eliminar {fpath}: {e}")

    def cleanup_old_files(self, max_age_hours: int = 24) -> int:
        """
        Elimina archivos MP3 en media/ más antiguos que max_age_hours.
        Retorna la cantidad de archivos eliminados.
        """
        deleted = 0
        cutoff = datetime.now() - timedelta(hours=max_age_hours)
        try:
            for fname in os.listdir(self.download_dir):
                fpath = os.path.join(self.download_dir, fname)
                if not os.path.isfile(fpath):
                    continue
                try:
                    mtime = datetime.fromtimestamp(os.path.getmtime(fpath))
                    if mtime < cutoff:
                        os.remove(fpath)
                        deleted += 1
                        logger.info(f"Archivo antiguo eliminado: {fpath}")
                except OSError as e:
                    logger.warning(f"No se pudo evaluar/eliminar {fpath}: {e}")
        except OSError as e:
            logger.error(f"Error listando directorio de descargas: {e}")
        return deleted
