/**
 * Carto Forum 3D — Globe terrestre interactif TDAH
 * Affiche les sources RSS géolocalisées sur un globe 3D
 * Fallback accessible : vue liste 2D
 *
 * Dépendance : Globe.GL (lazy load via CDN)
 * Licence : MIT (Globe.GL + Three.js)
 */

(function () {
  'use strict';

  const CONFIG = {
    globeImageUrl: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg',
    bumpImageUrl: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
    pointAlt: 0.01,
    pointRadius: 0.35,
    pointResolution: 12,
    initialLat: 25,
    initialLng: 10,
    initialAltitude: 2.2,
    rotationSpeed: 0.001,
    maxZoom: 4,
    minZoom: 1.2,
    labels: {
      fr: {
        clinical: 'Clinique',
        research: 'Recherche',
        association: 'Association',
        news: 'Actualités',
        title: 'Sections Carto Forum 3D',
        globe: '🌍 Globe 3D',
        list: '📋 Vue liste',
        pause: 'Pause',
        resume: 'Reprendre',
        reset: 'Réinitialiser',
        loading: 'Chargement du globe…',
        noWebgl: 'WebGL non disponible. Les articles sont affichés en vue liste.',
        empty: 'Aucun article trouvé.',
        emptyFilters: 'Aucun article ne correspond aux filtres sélectionnés.',
        sourceUnavailable: 'Les sources sont temporairement indisponibles. Réessaie plus tard.',
        disclaimer: '⚠ Information / ressource — ne remplace pas un avis médical'
      },
      en: {
        clinical: 'Clinical',
        research: 'Research',
        association: 'Association',
        news: 'News',
        title: 'Carto Forum 3D',
        globe: '🌍 3D Globe',
        list: '📋 List view',
        pause: 'Pause',
        resume: 'Resume',
        reset: 'Reset view',
        loading: 'Loading globe…',
        noWebgl: 'WebGL not available. Articles shown in list view.',
        empty: 'No articles found.',
        emptyFilters: 'No articles match the selected filters.',
        sourceUnavailable: 'Sources are temporarily unavailable. Try again later.',
        disclaimer: '⚠ Information / resource — does not replace medical advice'
      }
    }
  };

  let lang = 'fr';
  let globe = null;
  let globeWorld = null;
  let globeReady = false;
  let isPaused = false;
  let rotationFrame = null;
  let articles = [];
  let markers = [];
  let activeSourceId = null;

  // ── DOM refs ──
  const $ = id => document.getElementById(id);
  const section = $('carto-forum-3d');
  const container = $('globe-container');
  const listView = $('globe-list-view');
  const tooltip = $('globe-tooltip');
  const panel = $('globe-panel');
  const loader = $('globe-loader');
  const controls = $('globe-controls');
  const legend = $('globe-legend');
  const toggleBtns = document.querySelectorAll('#globe-view-toggle button');
  const fallbackEl = $('globe-fallback');

  // ── i18n shortcut ──
  function _(key) {
    return CONFIG.labels[lang] && CONFIG.labels[lang][key] !== undefined
      ? CONFIG.labels[lang][key]
      : CONFIG.labels.fr[key] || key;
  }

  // ── Detect language ──
  function detectLang() {
    try {
      const stored = localStorage.getItem('tdah_lang');
      if (stored === 'en' || stored === 'EN') { lang = 'en'; return; }
      if (stored === 'fr' || stored === 'FR') { lang = 'fr'; return; }
    } catch (e) { /* ignore */ }
    lang = document.documentElement.lang === 'en' ? 'en' : 'fr';
  }

  // ── WebGL check ──
  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('webgl2'));
    } catch (e) { return false; }
  }

  // ── Load Globe.GL ──
  function loadGlobeGL() {
    return new Promise((resolve, reject) => {
      if (typeof Globe !== 'undefined') { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/globe.gl@2.36.1/dist/globe.gl.min.js';
      s.async = true;
      s.onload = () => {
        // Wait a tick for Globe to be fully initialized
        setTimeout(() => {
          if (typeof Globe !== 'undefined') resolve();
          else reject(new Error('Globe.GL loaded but not found'));
        }, 100);
      };
      s.onerror = () => reject(new Error('Failed to load Globe.GL'));
      document.head.appendChild(s);
    });
  }

  // ── Fetch articles ──
  function loadArticles() {
    const feedPath = 'data/carto-feed.json';
    return fetch(feedPath + '?_=' + Date.now())
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(data => {
        articles = (data.articles || []).map(a => ({
          ...a,
          timestamp: a.date ? new Date(a.date).getTime() : 0
        }));
        articles.sort((a, b) => b.timestamp - a.timestamp);
        return articles;
      })
      .catch(() => {
        // Try demo file as fallback
        return fetch('data/rss-demo.json')
          .then(r => r.json())
          .then(data => {
            articles = (data.articles || []).map(a => ({
              ...a,
              timestamp: a.date ? new Date(a.date).getTime() : 0
            }));
            articles.sort((a, b) => b.timestamp - a.timestamp);
            return articles;
          })
          .catch(() => {
            articles = [];
            return [];
          });
      });
  }

  // ── Group articles by source ──
  function buildMarkers() {
    const groups = {};
    articles.forEach(a => {
      if (!a.sourceId) return;
      if (!groups[a.sourceId]) {
        groups[a.sourceId] = { sourceId: a.sourceId, source: a.source, lat: a.lat, lng: a.lng, country: a.country, category: a.category, articles: [] };
      }
      groups[a.sourceId].articles.push(a);
    });
    markers = Object.values(groups).filter(m => m.lat != null && m.lng != null);
    return markers;
  }

  // ── Category color ──
  function categoryColor(cat) {
    const map = {
      clinical: '#5a7fba',
      research: '#e8855a',
      association: '#4aa86a',
      news: '#b87ac4'
    };
    return map[cat] || '#888';
  }

  // ── Init globe ──
  function initGlobe() {
    if (!hasWebGL()) {
      showNoWebgl();
      return;
    }

    loader.style.display = 'block';
    container.style.display = 'block';
    fallbackEl.style.display = 'none';

    loadGlobeGL()
      .then(() => {
        if (!container || !container.parentElement) return;
        loader.style.display = 'none';

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        globeWorld = Globe()
          .globeImageUrl(CONFIG.globeImageUrl)
          .bumpImageUrl(CONFIG.bumpImageUrl)
          .backgroundColor('#050810')
          .atmosphereColor('#3a6ea5')
          .atmosphereAltitude(0.15)
          .pointOfView({
            lat: CONFIG.initialLat,
            lng: CONFIG.initialLng,
            altitude: CONFIG.initialAltitude
          })
          .pointsData(markers)
          .pointLat(d => d.lat)
          .pointLng(d => d.lng)
          .pointAltitude(CONFIG.pointAlt)
          .pointRadius(CONFIG.pointRadius)
          .pointResolution(CONFIG.pointResolution)
          .pointColor(d => categoryColor(d.category))
          .pointLabel(d => d.source)
          .onPointHover((d) => {
            container.style.cursor = d ? 'pointer' : 'default';
            if (d) {
              tooltip.innerHTML =
                '<div class="tt-source">' + escapeHtml(d.source) + '</div>' +
                '<div class="tt-count">' + d.articles.length + ' articles</div>' +
                '<div class="tt-country">' + escapeHtml(d.country || '') + ' · ' + _(d.category || 'news') + '</div>';
              tooltip.classList.add('visible');
            } else {
              tooltip.classList.remove('visible');
            }
          })
          .onPointClick(d => {
            if (d) openPanel(d);
          })
          (container);

        globeReady = true;
        container.classList.remove('no-webgl');

        if (!prefersReduced && !isPaused) {
          startRotation();
        }

        listenVisibility();
      })
      .catch(err => {
        if (loader) loader.style.display = 'none';
        console.warn('Carto 3D: Globe load failed, showing list', err.message);
        showNoWebgl();
        showListView();
      });
  }

  // ── Rotation ──
  function startRotation() {
    if (rotationFrame) cancelAnimationFrame(rotationFrame);
    if (!globeWorld || isPaused) return;

    function animate() {
      if (isPaused || !globeWorld) return;
      globeWorld.pointOfView({
        lat: globeWorld.pointOfView().lat,
        lng: globeWorld.pointOfView().lng + CONFIG.rotationSpeed,
        altitude: globeWorld.pointOfView().altitude
      });
      rotationFrame = requestAnimationFrame(animate);
    }
    animate();
  }

  function stopRotation() {
    if (rotationFrame) {
      cancelAnimationFrame(rotationFrame);
      rotationFrame = null;
    }
  }

  // ── Visibility listener ──
  function listenVisibility() {
    document.addEventListener('visibilitychange', function onVis() {
      if (document.hidden) { stopRotation(); }
      else if (!isPaused && globeReady) { startRotation(); }
    });
  }

  // ── Panel ──
  function openPanel(marker) {
    activeSourceId = marker.sourceId;
    const arts = marker.articles.slice(0, 5);
    let html = '<div class="panel-header">' +
      '<span class="panel-title">' + escapeHtml(marker.source) + '</span>' +
      '<button class="panel-close" onclick="document.getElementById(\'globe-panel\').classList.remove(\'open\')" aria-label="Fermer">&times;</button>' +
      '</div>';

    arts.forEach(a => {
      const d = a.description ? a.description.substring(0, 200) : '';
      html += '<div class="panel-article">' +
        '<h4>' + escapeHtml(a.title) + '</h4>' +
        '<div class="pa-meta">' + formatDate(a.date) + ' · ' + _(a.category || 'news') +
        (a.country ? ' · ' + escapeHtml(a.country) : '') + '</div>' +
        (d ? '<div class="pa-desc">' + escapeHtml(d) + '</div>' : '') +
        '<a class="pa-link" href="' + escapeAttr(a.link) + '" target="_blank" rel="noopener noreferrer">Lire la source →</a>' +
        '</div>';
    });

    panel.innerHTML = html;
    panel.classList.add('open');
  }

  // ── List view ──
  function showListView() {
    listView.classList.add('visible');
    container.style.display = 'none';
    panel.classList.remove('open');
    tooltip.classList.remove('visible');
    renderListView();
  }

  function hideListView() {
    listView.classList.remove('visible');
    if (globeReady) {
      container.style.display = 'block';
      if (!isPaused) startRotation();
    }
  }

  function renderListView(filtered) {
    const items = filtered || articles;
    const listEl = listView.querySelector('.lv-articles');
    const countEl = listView.querySelector('.lv-count');
    const updatedEl = listView.querySelector('.lv-updated');

    if (updatedEl) {
      const now = new Date();
      updatedEl.textContent = 'Dernière mise à jour : ' + now.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    if (items.length === 0) {
      if (countEl) countEl.textContent = '0 article';
      listEl.innerHTML = '<div class="lv-empty">' +
        (filtered ? _('emptyFilters') : _('empty')) + '</div>';
      return;
    }

    if (countEl) countEl.textContent = items.length + ' article' + (items.length > 1 ? 's' : '');

    let html = '';
    items.forEach(a => {
      const d = a.description ? a.description.substring(0, 250) : '';
      html += '<div class="lv-article">' +
        '<h4><a href="' + escapeAttr(a.link) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(a.title) + '</a></h4>' +
        '<div class="la-meta">' +
        '<span class="la-badge">' + _(a.category || 'news') + '</span>' +
        '<span>' + formatDate(a.date) + '</span>' +
        '<span>' + escapeHtml(a.source) + '</span>' +
        (a.country ? '<span>' + escapeHtml(a.country) + '</span>' : '') +
        (a.lang ? '<span>[' + a.lang + ']</span>' : '') +
        '</div>' +
        (d ? '<div class="la-desc">' + escapeHtml(d) + '</div>' : '') +
        '<a class="la-link" href="' + escapeAttr(a.link) + '" target="_blank" rel="noopener noreferrer">Lire la source →</a>' +
        '</div>';
    });

    listEl.innerHTML = html;

    // Disclaimer
    let disc = listView.querySelector('.lv-disclaimer');
    if (!disc) {
      disc = document.createElement('div');
      disc.className = 'lv-disclaimer';
      listView.appendChild(disc);
    }
    disc.textContent = _('disclaimer');
  }

  // ── Filters ──
  function applyFilters() {
    const langFilter = document.getElementById('filter-lang');
    const catFilter = document.getElementById('filter-category');
    const searchInput = document.getElementById('filter-search');

    let filtered = [...articles];

    if (langFilter && langFilter.value !== 'all') {
      filtered = filtered.filter(a => a.lang === langFilter.value);
    }
    if (catFilter && catFilter.value !== 'all') {
      filtered = filtered.filter(a => a.category === catFilter.value);
    }
    if (searchInput && searchInput.value.trim()) {
      const q = searchInput.value.trim().toLowerCase();
      filtered = filtered.filter(a =>
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.source && a.source.toLowerCase().includes(q))
      );
    }

    renderListView(filtered);
  }

  // ── Controls ──
  function setupControls() {
    // Pause/Resume
    const pauseBtn = $('globe-btn-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function () {
        isPaused = !isPaused;
        this.setAttribute('aria-pressed', isPaused);
        this.textContent = isPaused ? '▶' : '⏸';
        if (isPaused) stopRotation();
        else if (globeReady) startRotation();
      });
    }

    // Reset view
    const resetBtn = $('globe-btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (globeWorld) {
          globeWorld.pointOfView({
            lat: CONFIG.initialLat,
            lng: CONFIG.initialLng,
            altitude: CONFIG.initialAltitude
          });
        }
      });
    }

    // View toggle
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        toggleBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const view = this.getAttribute('data-view');
        if (view === 'globe') {
          hideListView();
          if (!globeReady && hasWebGL()) initGlobe();
          else if (!globeReady) showNoWebgl();
          else { container.style.display = 'block'; if (!isPaused) startRotation(); }
        } else {
          stopRotation();
          container.style.display = 'none';
          showListView();
        }
      });
    });

    // Clear filters
    const clearBtn = document.querySelector('.lv-btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        ['filter-lang', 'filter-category'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = 'all';
        });
        const search = document.getElementById('filter-search');
        if (search) search.value = '';
        applyFilters();
      });
    }

    // Filter change
    ['filter-lang', 'filter-category', 'filter-search'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', applyFilters);
        if (id === 'filter-search') {
          let debounceTimer;
          el.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFilters, 300);
          });
        }
      }
    });
  }

  // ── No WebGL ──
  function showNoWebgl() {
    container.classList.add('no-webgl');
    if (loader) loader.style.display = 'none';
    if (controls) controls.style.display = 'none';
    if (legend) legend.style.display = 'none';
    if (tooltip) tooltip.classList.remove('visible');
    if (fallbackEl) {
      fallbackEl.style.display = 'flex';
      fallbackEl.innerHTML =
        '<div class="fallback-icon">🌐</div>' +
        '<div class="fallback-text">' + _('noWebgl') + '</div>';
    }
    showListView();
  }

  // ── Init ──
  function init() {
    detectLang();
    setupControls();
    buildFilters();

    loadArticles().then(() => {
      buildMarkers();
      renderListView();

      if (!container) return;

      // Check WebGL
      if (!hasWebGL()) {
        showNoWebgl();
        toggleBtns.forEach(b => b.classList.remove('active'));
        const listBtn = document.querySelector('#globe-view-toggle [data-view="list"]');
        if (listBtn) listBtn.classList.add('active');
        return;
      }

      // Init globe after short delay for lazy loading
      setTimeout(() => {
        initGlobe();
      }, 300);
    }).catch(() => {
      renderListView([]);
      showNoWebgl();
    });
  }

  // ── Build filter selects ──
  function buildFilters() {
    const container = document.querySelector('.lv-filters');
    if (!container) return;

    // Already built check
    if (container.querySelector('select')) return;

    const filtersHTML = `
      <select id="filter-lang" aria-label="Langue">
        <option value="all">Toutes langues</option>
        <option value="FR">🇫🇷 Français</option>
        <option value="EN">🇬🇧 English</option>
      </select>
      <select id="filter-category" aria-label="Catégorie">
        <option value="all">Toutes catégories</option>
        <option value="clinical">Clinique</option>
        <option value="research">Recherche</option>
        <option value="association">Association</option>
        <option value="news">Actualités</option>
      </select>
      <input type="text" id="filter-search" placeholder="🔍 Rechercher…" aria-label="Rechercher">
      <button class="lv-btn-clear" aria-label="Effacer les filtres">✕ Effacer</button>
    `;
    container.innerHTML = filtersHTML;

    // Re-attach filter events after building
    ['filter-lang', 'filter-category', 'filter-search'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', applyFilters);
        if (id === 'filter-search') {
          let debounce;
          el.addEventListener('input', function () {
            clearTimeout(debounce);
            debounce = setTimeout(applyFilters, 300);
          });
        }
      }
    });

    const clearBtn = document.querySelector('.lv-btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        ['filter-lang', 'filter-category'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = 'all';
        });
        const search = document.getElementById('filter-search');
        if (search) search.value = '';
        applyFilters();
      });
    }
  }

  // ── Helpers ──
  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(s) {
    if (!s) return '#';
    return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.substring(0, 10);
      return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch (e) { return dateStr.substring(0, 10); }
  }

  // ── Start ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
