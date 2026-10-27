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

let selectedVideo = null;
let currentLang = 'es';
let translations = {};

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
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
}

function updateDownloadButtonText() {
    const fmt = formatSelect.value;
    const fmtLabel = fmt === 'mp4' ? 'MP4' : 'MP3';
    const qualityLabel = qualitySelect.options[qualitySelect.selectedIndex].text;
    downloadLink.textContent = `⬇ ${t('app.nav.select_btn')} ${escapeHtml(downloadLink.download || '')}`;
    downloadLink.download = downloadLink.download;
}

function updateDownloadButtonTextFilename(filename) {
    const fmt = formatSelect.value;
    const fmtLabel = fmt === 'mp4' ? 'MP4' : 'MP3';
    downloadLink.textContent = `⬇ ${escapeHtml(filename)}`;
    downloadLink.download = filename;
}

// ==================== TEMA (5 OPCIONES) ====================
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
        showToast('Tu navegador no soporta notificaciones', 'warning');
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
        new Notification(title, { body: body, icon: '/static/favicon.ico' });
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

// ==================== BÚSQUEDA ====================
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
            body: JSON.stringify({ query }),
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

// ==================== DESCARGA DE VÍDEO INDIVIDUAL ====================
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
        downloadLink.textContent = `⬇ ${escapeHtml(data.file_name)}`;
        downloadLink.download = data.file_name;

        showToast(t('app.toast.download_success', { format: fmtLabel.toUpperCase() }), 'success');
        showNotification('Downtube', `Descarga completada: ${title}`);
    } catch (err) {
        clearInterval(stageInterval);
        showError(err.message);
        progressContainer.classList.add('hidden');
    }
}

// ==================== EVENTOS ====================
searchBtn.addEventListener('click', searchMusic);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMusic();
});

// Inicializar notificaciones al cargar
requestNotificationPermission();
