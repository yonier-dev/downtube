const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
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

// Mostrar notificación toast
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

// Buscar música con debounce
async function searchMusic() {
    const query = searchInput.value.trim();
    if (!query) return;

    hideError();
    searchBtn.disabled = true;
    searchBtn.textContent = 'Buscando...';
    resultsContainer.classList.add('hidden');

    try {
        const response = await fetch('/api/search/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({ query }),
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
}

// Iniciar descarga con feedback de progreso por etapas
async function startDownload(url, title) {
    downloadSection.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    downloadResult.classList.add('hidden');
    errorMessage.classList.add('hidden');
    progressContainer.classList.remove('hidden');

    const stageMessages = [
        { text: 'Conectando con YouTube...', fill: 10 },
        { text: 'Extrayendo información del video...', fill: 25 },
        { text: 'Descargando audio...', fill: 50 },
        { text: 'Convirtiendo a MP3 (192 kbps)...', fill: 75 },
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
            body: JSON.stringify({ url }),
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

        showToast('¡Descarga lista! Haz clic para guardar el MP3.', 'success');
    } catch (err) {
        clearInterval(stageInterval);
        showError(err.message);
        progressContainer.classList.add('hidden');
    }
}

// Eventos
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
