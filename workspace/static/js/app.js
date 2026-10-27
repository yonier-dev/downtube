const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const formatSelect = document.getElementById('formatSelect');
const qualitySelect = document.getElementById('qualitySelect');
const themeSelect = document.getElementById('themeSelect');
const langSelect = document.getElementById('langSelect');
const resultsContainer = document.getElementById('resultsContainer');
const resultsList = document.getElementById('resultsList');
const downloadSection = document.getElementById('downloadSection');
const downloadInfo = document.getElementById('downloadInfo');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const downloadResult = document.getElementById('downloadResult');
const downloadLink = document.getElementById('downloadLink');
const errorMessage = document.getElementById('errorMessage');

// Spotify elements
const spotifySection = document.getElementById('spotifySection');
const spotifyUrlInput = document.getElementById('spotifyUrlInput');
const spotifyImportBtn = document.getElementById('spotifyImportBtn');
const spotifyResults = document.getElementById('spotifyResults');
const spotifySummary = document.getElementById('spotifySummary');

let selectedVideo = null;
let searchTimeout = null;
let currentLang = 'es';
let translations = {};
let spotifyTracks = [];
let selectedTracks = new Set();

// ==================== I18N ====================
async function loadTranslations(lang) {
    try {
        const response = await fetch(`/static/locales/${lang}.json`);
        if (!response.ok) throw new Error(`No se pudo cargar ${lang}.json`);
        translations = await response.json();
        currentLang = lang;
        localStorage.setItem('lang', lang);
        applyTranslations();
    } catch (err) {
        console.error('Error cargando traducciones:', err);
    }
}

function t(key, params = {}) {
    let text = translations[key] || key;
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    return text;
}

function applyTranslations() {
    // Traducir elementos con data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    // Traducir placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
    // Actualizar botón de descarga individual según formato
    updateDownloadButtonText();
    // Actualizar resumen de Spotify si está visible
    if (spotifyTracks.length > 0) {
        renderSpotifyResults(spotifyTracks);
    }
}

function updateDownloadButtonText() {
    const fmt = formatSelect.value;
    const fmtLabel = fmt === 'mp4' ? t('app.nav.view_btn') === 'Ver' ? 'MP4' : 'MP4' : 'MP3';
    // El botón de descarga individual se actualiza dinámicamente en startDownload
}

// ==================== TEMA (5 OPCIONES) ====================
// Cargar tema guardado o usar el por defecto (Azul Eléctrico)
const savedTheme = localStorage.getItem('theme') || 'electric-blue';
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
} else {
    document.documentElement.removeAttribute('data-theme');
}
themeSelect.value = savedTheme;

themeSelect.addEventListener('change', (e) => {
    const selectedTheme = e.target.value;
    if (selectedTheme) {
        document.documentElement.setAttribute('data-theme', selectedTheme);
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', selectedTheme);
});

// ==================== IDIOMA ====================
const savedLang = localStorage.getItem('lang') || 'es';
langSelect.value = savedLang;
loadTranslations(savedLang);

langSelect.addEventListener('change', (e) => {
    loadTranslations(e.target.value);
});

// ==================== NOTIFICACIONES DEL NAVEGADOR ====================
let notificationPermission = 'default';

function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast(t('app.toast.error'), 'warning');
        return;
    }

    Notification.requestPermission().then(permission => {
        notificationPermission = permission;
        if (permission === 'granted') {
            showToast('Notificaciones activadas ✅', 'success');
        } else {
            showToast('Notificaciones bloqueadas ❌', 'warning');
        }
    });
}

function showNotification(title, body) {
    if (notificationPermission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '/static/favicon.ico'
        });
    }
}

// ==================== MOSTRAR TOAST ====================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Mostrar error en la interfaz
function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
    showToast(msg, 'error');
}

// Ocultar error
function hideError() {
    errorMessage.classList.add('hidden');
}

// Formatear duración en minutos:segundos
function formatDuration(seconds) {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Obtener cookie CSRF
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.substring(0, name.length + 1) === name + '=') {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ==================== MOSTRAR TOAST ====================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Cambiar opciones de calidad según el formato seleccionado
function updateQualityOptions() {
    const isMp4 = formatSelect.value === 'mp4';
    qualitySelect.innerHTML = '';

    if (isMp4) {
        qualitySelect.innerHTML = `
            <option value="360">360p</option>
            <option value="480">480p</option>
            <option value="720" selected>720p</option>
            <option value="1080">1080p</option>
        `;
    } else {
        qualitySelect.innerHTML = `
            <option value="128">128 kbps</option>
            <option value="192" selected>192 kbps</option>
            <option value="320">320 kbps</option>
        `;
    }
}

formatSelect.addEventListener('change', updateQualityOptions);

// Inicializar opciones de calidad al cargar
updateQualityOptions();

// ==================== BÚSQUEDA CON FILTROS ====================
async function searchMusic() {
    const query = searchInput.value.trim();
    if (!query) return;

    hideError();
    searchBtn.disabled = true;
    searchBtn.textContent = t('app.search.btn') + '...';
    resultsContainer.classList.add('hidden');

    try {
        const response = await fetch('/api/search/filtered/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({
                query
            }),
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || t('app.toast.error'));

        renderResults(data.results);
        showToast(t('app.toast.search_success', { count: data.count }), 'success');
    } catch (err) {
        showError(err.message);
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = t('app.search.btn');
    }
}

// Renderizar resultados
function renderResults(results) {
    resultsList.innerHTML = '';

    if (results.length === 0) {
        resultsList.innerHTML = `<li style="padding:1.5rem;color:var(--text-muted);text-align:center">${t('app.results.no_results')}</li>`;
    }

    results.forEach(video => {
        const thumbnailUrl = video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
        const li = document.createElement('li');
        li.className = 'result-item';
        li.innerHTML = `
            <img src="${escapeHtml(thumbnailUrl)}" alt="thumb" class="result-thumbnail" loading="lazy">
            <div class="result-info">
                <div class="result-title">${escapeHtml(video.title)}</div>
                <div class="result-meta">
                    <span>⏱ ${formatDuration(video.duration)}</span>
                </div>
            </div>
            <div class="result-actions">
                <button class="view-btn" type="button" data-url="${escapeHtml(video.url)}" data-title="${escapeHtml(video.title)}" title="${t('app.nav.view_btn')}">▶ ${t('app.nav.view_btn')}</button>
                <button class="select-btn" type="button" data-url="${escapeHtml(video.url)}" data-title="${escapeHtml(video.title)}">${t('app.nav.select_btn')}</button>
            </div>
        `;
        resultsList.appendChild(li);
    });

    resultsContainer.classList.remove('hidden');

    document.querySelectorAll('.select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = e.target.dataset.url;
            const title = e.target.dataset.title;
            selectedVideo = { url, title };
            startDownload(url, title);
        });
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = e.target.dataset.url;
            const title = e.target.dataset.title;
            window.open(url, '_blank');
            showToast(`Abriendo "${escapeHtml(title)}" en YouTube...`, 'success');
        });
    });
}

// ==================== DESCARGA DE VIDEO INDIVIDUAL ====================
async function startDownload(url, title) {
    const fmt = formatSelect.value;
    const quality = qualitySelect.value;
    const fmtLabel = fmt === 'mp4' ? 'MP4' : 'MP3';
    const qualityLabel = qualitySelect.options[qualitySelect.selectedIndex].text;

    downloadSection.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    downloadResult.classList.add('hidden');
    errorMessage.classList.add('hidden');
    progressContainer.classList.remove('hidden');

    const stageMessages = [
        { text: 'Conectando con YouTube...', fill: 10 },
        { text: 'Extrayendo información del video...', fill: 25 },
        { text: `Descargando ${fmtLabel.toUpperCase()}...`, fill: 50 },
        { text: `Procesando ${fmtLabel.toUpperCase()} (${qualityLabel})...`, fill: 75 },
        { text: 'Finalizando...', fill: 90 },
    ];

    let stageIndex = 0;
    const updateStage = () => {
        if (stageIndex < stageMessages.length) {
            progressText.textContent = stageMessages[stageIndex].text;
            progressFill.style.width = `${stageMessages[stageIndex].fill}%`;
            stageIndex++;
        }
    };

    updateStage();
    const stageInterval = setInterval(updateStage, 800);

    try {
        const response = await fetch('/api/download/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({ url, format: fmt, quality }),
        });

        clearInterval(stageInterval);

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || t('app.toast.error'));

        progressFill.style.width = '100%';
        progressText.textContent = t('app.download.btn') + ' completa';
        downloadResult.classList.remove('hidden');
        progressContainer.classList.add('hidden');

        downloadLink.href = data.download_url;
        downloadLink.textContent = `⬇ ${t('app.nav.select_btn')} ${escapeHtml(data.file_name)}`;
        downloadLink.download = data.file_name;

        showToast(t('app.toast.download_success', { format: fmtLabel.toUpperCase() }), 'success');
        showNotification('Downtube', `Descarga completada: ${title}`);
    } catch (err) {
        clearInterval(stageInterval);
        showError(err.message);
        progressContainer.classList.add('hidden');
    }
}

// ==================== SPOTIFY: IMPORTAR PLAYLIST ====================
spotifyImportBtn.addEventListener('click', async () => {
    const url = spotifyUrlInput.value.trim();
    if (!url) {
        showToast(t('app.spotify.error_invalid_url'), 'error');
        return;
    }

    spotifyImportBtn.disabled = true;
    spotifyImportBtn.textContent = 'Importando...';
    spotifyResults.classList.add('hidden');
    spotifySummary.classList.add('hidden');

    try {
        const response = await fetch('/api/spotify/playlist/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || t('app.spotify.error_fetch'));

        spotifyTracks = data.tracks || [];
        selectedTracks = new Set();

        renderSpotifyResults(spotifyTracks);
        spotifyResults.classList.remove('hidden');

        const summaryClass = 'success';
        const summaryText = `${t('app.spotify.tracks')} ${spotifyTracks.length}`;
        spotifySummary.className = `spotify-summary ${summaryClass}`;
        spotifySummary.textContent = summaryText;
        spotifySummary.classList.remove('hidden');

        showToast(`${spotifyTracks.length} ${t('app.spotify.tracks').toLowerCase()}`, 'success');

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        spotifyImportBtn.disabled = false;
        spotifyImportBtn.textContent = t('app.spotify.btn');
    }
});

// Renderizar resultados de Spotify
function renderSpotifyResults(tracks) {
    spotifyResults.innerHTML = '';

    if (tracks.length === 0) {
        spotifyResults.innerHTML = `<li style="padding:1.5rem;color:var(--text-muted);text-align:center">${t('app.results.no_results')}</li>`;
        return;
    }

    tracks.forEach((track, index) => {
        const isSelected = selectedTracks.has(index);
        const li = document.createElement('li');
        li.className = 'spotify-track';
        li.innerHTML = `
            <img src="${escapeHtml(track.thumbnail || 'https://via.placeholder.com/48')}" alt="thumb" class="spotify-track-thumbnail" loading="lazy">
            <div class="spotify-track-info">
                <div class="spotify-track-title">${escapeHtml(track.title)}</div>
                <div class="spotify-track-artist">${escapeHtml(track.artist)}</div>
            </div>
            <div class="spotify-track-actions">
                <input type="checkbox" class="spotify-track-checkbox" data-index="${index}" ${isSelected ? 'checked' : ''}>
                <button class="spotify-track-view" type="button" data-url="${escapeHtml(track.spotify_url)}" data-title="${escapeHtml(track.title)}" title="${t('app.nav.view_btn')}">▶ ${t('app.nav.view_btn')}</button>
                <button class="spotify-track-select" type="button" data-index="${index}" ${isSelected ? 'disabled' : ''}>${t('app.nav.select_btn')}</button>
            </div>
        `;
        spotifyResults.appendChild(li);
    });

    // Eventos checkboxes
    spotifyResults.querySelectorAll('.spotify-track-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            if (e.target.checked) {
                selectedTracks.add(idx);
            } else {
                selectedTracks.delete(idx);
            }
            updateSpotifyButtons();
        });
    });

    // Eventos botones ver
    spotifyResults.querySelectorAll('.spotify-track-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = e.target.dataset.url;
            const title = e.target.dataset.title;
            window.open(url, '_blank');
            showToast(`Abriendo "${escapeHtml(title)}" en Spotify...`, 'success');
        });
    });

    // Eventos botones seleccionar/descargar individual
    spotifyResults.querySelectorAll('.spotify-track-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(e.target.dataset.index);
            const track = spotifyTracks[idx];
            if (!track) return;

            // Buscar en YouTube y descargar
            searchYouTubeAndDownload(track.title, track.artist);
        });
    });
}

function updateSpotifyButtons() {
    const count = selectedTracks.size;
    const selectAllBtn = document.querySelector('.spotify-select-all');
    const downloadBtn = document.querySelector('.spotify-download-selected-btn');

    if (selectAllBtn) {
        selectAllBtn.textContent = count === spotifyTracks.length
            ? t('app.spotify.select_all')
            : t('app.spotify.select_all');
    }

    if (downloadBtn) {
        downloadBtn.disabled = count === 0;
        downloadBtn.textContent = count > 0
            ? `${t('app.spotify.download_selected')} (${count})`
            : t('app.spotify.download_selected');
    }
}

// Buscar en YouTube y descargar un track de Spotify
async function searchYouTubeAndDownload(trackTitle, artist) {
    const query = `${artist} ${trackTitle}`.trim();

    try {
        const response = await fetch('/api/search/filtered/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({ query }),
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || t('app.toast.error'));

        if (data.results && data.results.length > 0) {
            // Tomar el primer resultado
            const video = data.results[0];
            startDownload(video.url, video.title);
        } else {
            showToast(`No se encontró en YouTube: ${trackTitle}`, 'error');
        }
    } catch (err) {
        showError(err.message);
    }
}

// Descargar todos los tracks seleccionados de Spotify
async function downloadSelectedSpotifyTracks() {
    if (selectedTracks.size === 0) {
        showToast('Selecciona al menos una canción', 'error');
        return;
    }

    const indices = Array.from(selectedTracks).sort((a, b) => a - b);
    let current = 0;

    async function downloadNext() {
        if (current >= indices.length) {
            showToast('Descargas completadas', 'success');
            return;
        }

        const idx = indices[current];
        const track = spotifyTracks[idx];
        const query = `${track.artist} ${track.title}`.trim();

        showToast(`Descargando ${current + 1}/${indices.length}: ${track.title}`, 'info');

        try {
            const response = await fetch('/api/search/filtered/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify({ query }),
            });

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const video = data.results[0];
                // Descargar directamente
                await startDownloadSilent(video.url, video.title);
            } else {
                showToast(`No encontrado en YouTube: ${track.title}`, 'warning');
            }
        } catch (err) {
            showToast(`Error con ${track.title}`, 'error');
        }

        current++;
        setTimeout(downloadNext, 1500); // Espera entre descargas para no saturar
    }

    downloadNext();
}

// Descarga silenciosa (sin UI de progreso) para tracks de Spotify
async function startDownloadSilent(url, title) {
    const fmt = formatSelect.value;
    const quality = qualitySelect.value;

    try {
        const response = await fetch('/api/download/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({ url, format: fmt, quality }),
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || t('app.toast.error'));
        return data;
    } catch (err) {
        throw err;
    }
}

// ==================== EVENTOS ====================
searchBtn.addEventListener('click', searchMusic);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMusic();
});

// Debounce en el input para búsqueda automática opcional
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    // Opcional: búsqueda automática tras pausa
    // searchTimeout = setTimeout(searchMusic, 500);
});

// Inicializar notificaciones al cargar
requestNotificationPermission();

// Botón "Seleccionar todo" para Spotify
document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('spotify-select-all')) {
        if (selectedTracks.size === spotifyTracks.length) {
            selectedTracks = new Set();
        } else {
            spotifyTracks.forEach((_, idx) => selectedTracks.add(idx));
        }
        renderSpotifyResults(spotifyTracks);
        updateSpotifyButtons();
    }

    if (e.target && e.target.classList.contains('spotify-download-selected-btn')) {
        downloadSelectedSpotifyTracks();
    }
});

// Inicializar botones de Spotify (se crean dinámicamente, así que se actualizan al renderizar)
function initSpotifyButtons() {
    // Los botones se crean en renderSpotifyResults
}

// Exponer para uso global si es necesario
window.Downtube = {
    searchMusic,
    startDownload,
    loadTranslations,
    t,
};
