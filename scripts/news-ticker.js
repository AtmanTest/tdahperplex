/**
 * News Ticker — JS requestAnimationFrame scrolling
 * Seamless loop, fast (150px/s), pauses on hover
 */
(function(){
  'use strict';
  const TICKER_EL = document.getElementById('news-ticker');
  const LIST_EL = document.getElementById('news-list');
  const FILTERS = document.getElementById('news-filters');
  let articles = [], filter = 'all';

  var tickerSpeed = 150; // px per second (was 80 — user said 3x too slow)

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function fmtDate(d){
    if(!d) return '';
    try{var dt=new Date(d);return dt.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}catch(e){return d}
  }

  async function loadNews(){
    try {
      const r = await fetch('news.json?_=' + Date.now());
      if(!r.ok) throw new Error('HTTP '+r.status);
      const d = await r.json();
      articles = d.articles || [];
      render(filter);
      initTicker(articles.slice(0,10));
    } catch(e){
      if(TICKER_EL) TICKER_EL.innerHTML = '<span class="news-banner-item active">📡 Actualités indisponibles</span>';
      if(LIST_EL) LIST_EL.innerHTML = '<div class="news-error">⚠ Erreur : '+esc(e.message)+'</div>';
    }
  }

  // ── JS-BASED TICKER (replaces CSS animation) ──
  var tickerRAF = null, tickerX = 0, tickerPaused = false;

  function initTicker(arr){
    var track = document.getElementById('news-track');
    if(!track) return;
    if(!arr.length){ track.innerHTML = '<span class="news-track-item">Aucune actualité</span>'; return; }

    var html = arr.map(function(a){
      var safeTitle = esc(a.title).replace(/<[^>]*>/g, '');
      return '<span class="news-track-item">'+
        '<span class="news-title">'+(a.icon||'📰')+' '+safeTitle+'</span>'+
        (a.description ? '<span class="news-desc">'+esc(a.description.substring(0,120)).replace(/<[^>]*>/g, '')+'</span>' : '')+
        '</span>';
    }).join('');

    // Duplicate for seamless loop
    track.innerHTML = html + html;

    // Remove old CSS animation
    track.style.animation = 'none';

    // Cancel previous RAF
    if(tickerRAF) cancelAnimationFrame(tickerRAF);
    tickerX = 0;
    tickerPaused = false;

    // Hover pause
    track.parentElement.onmouseenter = function(){ tickerPaused = true; };
    track.parentElement.onmouseleave = function(){ tickerPaused = false; };

    var halfW = track.scrollWidth / 2;
    if(halfW <= 0) return;

    var lastTime = performance.now();

    function frame(now){
      if(!tickerPaused){
        var dt = (now - lastTime) / 1000;
        tickerX += tickerSpeed * dt;
        if(tickerX >= halfW) tickerX -= halfW;
        track.style.transform = 'translateX(-' + tickerX + 'px)';
      }
      lastTime = now;
      tickerRAF = requestAnimationFrame(frame);
    }

    tickerRAF = requestAnimationFrame(frame);
  }

  // ── NEWS LIST RENDER ──
  function render(f){
    if(!LIST_EL) return;
    var arr = f==='all' ? articles : articles.filter(function(a){ return a.lang===f; });
    if(!arr.length){ LIST_EL.innerHTML = '<div class="news-loading">Aucun article</div>'; return; }
    LIST_EL.innerHTML = arr.map(function(a){
      return '<div class="news-card">'+
        '<div class="news-card-top">'+
          '<span class="news-source-badge '+(a.lang==='FR'?'fr':'en')+'">'+(a.icon||'📰')+' '+esc(a.source||(a.lang==='FR'?'TDAH France':'ADHD'))+'</span>'+
          (a.date ? '<span class="news-date">'+fmtDate(a.date)+'</span>' : '')+
          (a.lang==='FR' ? '<span style="font-size:.6rem;color:#3d7a3d">🇫🇷</span>' : '<span style="font-size:.6rem;color:var(--accent)\">🇬🇧</span>')+
        '</div>'+
        '<div class="news-card-title"><a href="'+esc(a.link)+'" target="_blank" rel="noopener">'+esc(a.title)+'</a></div>'+
        (a.description ? '<div class="news-card-desc">'+esc(a.description.replace(/<[^>]*>/g,'').substring(0,200))+'</div>' : '')+
      '</div>';
    }).join('');
  }

  // ── FILTERS ──
  if(FILTERS){
    FILTERS.addEventListener('click', function(e){
      var btn = e.target.closest('.news-filter-btn');
      if(!btn) return;
      FILTERS.querySelectorAll('.news-filter-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      filter = btn.getAttribute('data-filter') || 'all';
      render(filter);
    });
  }

  // ── BOOT ──
  if(document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', loadNews);
  else
    loadNews();
})();
