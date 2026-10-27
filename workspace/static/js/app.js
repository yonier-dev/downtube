const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const formatSelect = document.getElementById('formatSelect');
const qualitySelect = document.getElementById('qualitySelect');
const themeSelect = document.getElementById('themeSelect');
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
let searchTimeout = null;

// ==================== SELECTOR DE TEMAS (5 OPCIONES) ====================

// Cargar tema guardado o usar el por defecto (vacío = :root Oscuro Neón)
const savedTheme = localStorage.getItem('theme') || '';
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
        new Notification(title, {
            body: body,
            icon: '/static/favicon.ico'
        });
    }
}

// ==================== FILTROS DE DURACIÓN ====================
const minDurationInput = document.createElement('input');
minDurationInput.type = 'number';
minDurationInput.placeholder = 'Mín (seg)';
minDurationInput.className = 'filter-input';
minDurationInput.id = 'minDurationInput';

const maxDurationInput = document.createElement('input');
maxDurationInput.type = 'number';
maxDurationInput.placeholder = 'Máx (seg)';
maxDurationInput.className = 'filter-input';
maxDurationInput.id = 'maxDurationInput';

// Insertar filtros después del input de búsqueda
const searchInputGroup = document.querySelector('.input-group');
const filtersGroup = document.createElement('div');
filtersGroup.className = 'filters-group';
filtersGroup.appendChild(minDurationInput);
filtersGroup.appendChild(maxDurationInput);
searchInputGroup.parentNode.insertBefore(filtersGroup, searchInputGroup.nextSibling);

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

// ==================== BÚSQUEDA CON FILTROS ====================
async function searchMusic() {
    const query = searchInput.value.trim();
    if (!query) return;

    hideError();
    searchBtn.disabled = true;
    searchBtn.textContent = 'Buscando...';
    resultsContainer.classList.add('hidden');

    const minDur = minDurationInput.value || null;
    const maxDur = maxDurationInput.value || null;

    try {
        const response = await fetch('/api/search/filtered/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({
                query,
                min_duration: minDur,
                max_duration: maxDur
            }),
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Error en la búsqueda');

        renderResults(data.results);
        showToast(`Se encontraron ${data.count} resultado(s)`, 'success');
    } catch (err) {
        showError(err.message);
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Buscar';
    }
}

// Renderizar resultados
function renderResults(results) {
    resultsList.innerHTML = '';

    if (results.length === 0) {
        resultsList.innerHTML = '<li style="padding:1.5rem;color:var(--text-muted);text-align:center">No se encontraron resultados</li>';
    }

    results.forEach(video => {
        const li = document.createElement('li');
        li.className = 'result-item';
        li.innerHTML = `
            <img src="${escapeHtml(video.thumbnail || 'https://via.placeholder.com/64')}" alt="thumb" class="result-thumbnail" loading="lazy">
            <div class="result-info">
                <div class="result-title">${escapeHtml(video.title)}</div>
                <div class="result-meta">
                    <span>⏱ ${formatDuration(video.duration)}</span>
                </div>
            </div>
            <div class="result-actions">
                <button class="view-btn" type="button" data-url="${escapeHtml(video.url)}" data-title="${escapeHtml(video.title)}" title="Ver en YouTube">▶ Ver</button>
                <button class="select-btn" type="button" data-url="${escapeHtml(video.url)}" data-title="${escapeHtml(video.title)}">Seleccionar</button>
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

        if (!response.ok) throw new Error(data.error || 'Error al descargar');

        progressFill.style.width = '100%';
        progressText.textContent = 'Descarga completa';
        downloadResult.classList.remove('hidden');
        progressContainer.classList.add('hidden');

        downloadLink.href = data.download_url;
        downloadLink.textContent = `⬇ Descargar ${escapeHtml(data.file_name)}`;
        downloadLink.download = data.file_name;

        showToast(`¡Descarga lista! Haz clic para guardar el ${fmtLabel.toUpperCase()}.`, 'success');
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

// Debounce en el input para búsqueda automática opcional
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    // Opcional: búsqueda automática tras pausa
    // searchTimeout = setTimeout(searchMusic, 500);
});

// Inicializar notificaciones al cargar
requestNotificationPermission();
