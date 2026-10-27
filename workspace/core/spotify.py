import os
import re
import logging
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from django.conf import settings

logger = logging.getLogger(__name__)


class SpotifyService:
    """Servicio para obtener información de playlists públicas de Spotify."""

    def __init__(self):
        client_id = os.getenv('SPOTIFY_CLIENT_ID', '')
        client_secret = os.getenv('SPOTIFY_CLIENT_SECRET', '')

        if not client_id or not client_secret:
            raise RuntimeError(
                "Faltan credenciales de Spotify en el entorno (.env). "
                "Configura SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET."
            )

        self._client = spotipy.Spotify(
            auth_manager=SpotifyClientCredentials(
                client_id=client_id,
                client_secret=client_secret,
            )
        )

    @staticmethod
    def _extract_playlist_id(playlist_url: str) -> str:
        """
        Extrae el ID de una playlist de Spotify desde su URL.
        Acepta formatos como:
        https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
        https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
        """
        match = re.search(r'/playlist/([a-zA-Z0-9]+)', playlist_url)
        if not match:
            raise ValueError("La URL no es una playlist válida de Spotify.")
        return match.group(1)

    def get_playlist_tracks(self, playlist_url: str) -> dict:
        """
        Obtiene los tracks de una playlist pública de Spotify.
        Devuelve un diccionario con metadatos de la playlist y lista de tracks.
        """
        playlist_id = self._extract_playlist_id(playlist_url)

        try:
            playlist_info = self._client.playlist(playlist_id, fields='name,images,tracks.total,owner')
        except Exception as e:
            logger.error(f"Error obteniendo playlist de Spotify: {e}")
            raise RuntimeError(f"No se pudo obtener la playlist de Spotify: {str(e)}")

        tracks = []
        try:
            results = self._client.playlist_tracks(playlist_id, fields='items(track(name,artists,name,duration_ms,album.images,external_urls,preview_url)),next')
            items = results.get('items', [])

            for item in items:
                track = item.get('track')
                if not track:
                    continue
                artists = ', '.join([a.get('name', '') for a in track.get('artists', [])])
                images = track.get('album', {}).get('images', [])
                thumbnail = images[0].get('url', '') if images else ''
                tracks.append({
                    'title': track.get('name', ''),
                    'artist': artists,
                    'duration_ms': track.get('duration_ms', 0),
                    'duration_s': round(track.get('duration_ms', 0) / 1000),
                    'thumbnail': thumbnail,
                    'spotify_url': track.get('external_urls', {}).get('spotify', ''),
                })
        except Exception as e:
            logger.error(f"Error obteniendo tracks de Spotify: {e}")
            raise RuntimeError(f"No se pudo obtener las canciones de la playlist: {str(e)}")

        return {
            'playlist_id': playlist_id,
            'playlist_name': playlist_info.get('name', 'Playlist de Spotify'),
            'playlist_thumbnail': playlist_info.get('images', [{}])[0].get('url', '') if playlist_info.get('images') else '',
            'total_tracks': playlist_info.get('tracks', {}).get('total', len(tracks)),
            'tracks': tracks,
        }
