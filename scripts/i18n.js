/**
 * TDAH Profile — i18n Language Loader
 * Switches between FR (default) and EN
 * Persists choice in localStorage
 */
(function(){
  'use strict';

  const STORAGE_KEY = 'tdah_lang';
  const TOGGLE_ID = 'lang-toggle';

  function getSavedLang(){
    try { return localStorage.getItem(STORAGE_KEY) || 'en'; }
    catch(e){ return 'en'; }
  }

  function saveLang(lang){
    try { localStorage.setItem(STORAGE_KEY, lang); } catch(e){}
  }

  function applyLang(lang){
    if(!i18n || !i18n[lang]) return;

    // Update html lang attribute
    if(i18n[lang]['html.lang'])
      document.documentElement.lang = i18n[lang]['html.lang'];

    // Update page title
    if(i18n[lang]['meta.title'])
      document.title = i18n[lang]['meta.title'];

    // Iterate all data-i18n elements
    var els = document.querySelectorAll('[data-i18n]');
    for(var i=0; i<els.length; i++){
      var el = els[i];
      var key = el.getAttribute('data-i18n');
      var val = i18n[lang][key];
      if(val === undefined) continue;

      var attr = el.getAttribute('data-i18n-attr');
      if(attr){
        // data-i18n-attr="placeholder" → setAttribute('placeholder', val)
        el.setAttribute(attr, val);
      } else {
        // Inner HTML
        el.innerHTML = val;
      }
    }

    // Update toggle button appearance
    var tog = document.getElementById(TOGGLE_ID);
    if(tog){
      tog.innerHTML = lang === 'fr'
        ? '🇫🇷<span style="opacity:.4">/</span>🇬🇧'
        : '<span style="opacity:.4">🇫🇷</span><span style="opacity:.4">/</span>🇬🇧';
      tog.setAttribute('data-lang', lang);
    }
  }

  // Init toggle
  function initToggle(){
    var btn = document.getElementById(TOGGLE_ID);
    if(!btn) return;

    btn.addEventListener('click', function(e){
      e.preventDefault();
      var current = this.getAttribute('data-lang') || 'fr';
      var next = current === 'fr' ? 'en' : 'fr';
      saveLang(next);
      applyLang(next);
    });
  }

  // Boot
  var saved = getSavedLang();
  applyLang(saved);
  initToggle();
})();
