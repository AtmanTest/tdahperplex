/**
 * test-runner.js — Composant TestRunner réutilisable
 * 
 * Affiche n'importe quel test à partir de sa config JSON.
 * Gère : navigation question par question, barre de progression,
 *         retour arrière, sauvegarde localStorage, validation.
 * 
 * Usage : TestRunner.start(config, containerElement, onComplete)
 */

(function(global) {
  'use strict';

  /**
   * Crée le HTML des options de réponse pour un item
   */
  function renderOptions(item, currentValue, itemIndex) {
    const itemId = item.id;
    
    if (item.type === 'criterion-multi' && item.subitems) {
      // Mode multi-sous-questions (borderline)
      return item.subitems.map((sub, si) => {
        const subId = itemId + '_' + si;
        const checked = currentValue && currentValue[si] !== undefined;
        const selectedVal = currentValue ? currentValue[si] : null;
        
        return `
          <div class="tq-subitem">
            <div class="tq-subitem-text">${sub}</div>
            <div class="tq-opts tq-opts-3">
              ${item.options.map(opt => `
                <label class="tq-opt tq-opt-sm${selectedVal === opt.value ? ' selected' : ''}">
                  <input type="radio" name="tq_${subId}" value="${opt.value}"
                    ${selectedVal === opt.value ? 'checked' : ''}
                    data-item="${itemId}" data-sub="${si}">
                  <span>${opt.label}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    // Mode standard (une question, plusieurs options)
    return `
      <div class="tq-opts">
        ${item.options.map((opt, oi) => {
          const isSelected = currentValue === opt.value;
          return `
            <label class="tq-opt${isSelected ? ' selected' : ''}">
              <input type="radio" name="tq_${itemId}" value="${opt.value}"
                ${isSelected ? 'checked' : ''}>
              <span class="tq-opt-num">${String.fromCharCode(65 + oi)}</span>
              <span class="tq-opt-text">${opt.label}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Récupère les réponses du DOM pour un item
   */
  function getItemResponses(item) {
    if (item.type === 'criterion-multi' && item.subitems) {
      const responses = {};
      item.subitems.forEach((_, si) => {
        const subId = item.id + '_' + si;
        const checked = document.querySelector(`input[name="tq_${subId}"]:checked`);
        if (checked) {
          responses[subId] = parseFloat(checked.value);
        }
      });
      return responses;
    }

    const checked = document.querySelector(`input[name="tq_${item.id}"]:checked`);
    return checked ? parseFloat(checked.value) : null;
  }

  /**
   * Valide qu'un item a reçu une réponse
   */
  function validateItem(item, responses) {
    if (item.type === 'criterion-multi' && item.subitems) {
      // Au moins une sous-question répondue
      const subIds = item.subitems.map((_, si) => item.id + '_' + si);
      return subIds.some(id => responses[id] !== undefined && responses[id] !== null);
    }
    return responses !== null && responses !== undefined;
  }

  const TestRunner = {
    _state: {
      config: null,
      container: null,
      currentIndex: 0,
      responses: {},
      multiResponses: {},  // Pour les items multi (borderline) : { itemId: [val, val, ...] }
      totalItems: 0,
      onComplete: null,
      started: false
    },

    /**
     * Démarre le test dans un conteneur
     * @param {object} config - La config JSON du test
     * @param {HTMLElement} container - Le conteneur DOM
     * @param {function} onComplete - Callback(scoreResult)
     */
    start: function(config, container, onComplete) {
      if (!config || !container) return;

      this._state.config = config;
      this._state.container = container;
      this._state.onComplete = onComplete || function() {};
      this._state.totalItems = config.items.length;

      // Restaurer progression sauvegardée
      const saved = HistoryManager.getInProgress(config.id);
      if (saved) {
        this._state.responses = saved.responses || {};
        this._state.currentIndex = saved.currentIndex || 0;
      } else {
        this._state.responses = {};
        this._state.currentIndex = 0;
      }
      this._state.multiResponses = {};

      this._state.started = true;
      this.render();
    },

    /**
     * Affiche la question courante
     */
    render: function() {
      const state = this._state;
      const config = state.config;
      const items = config.items;
      const idx = state.currentIndex;
      const item = items[idx];

      if (idx >= items.length) {
        this.finish();
        return;
      }

      const currentVal = state.responses[item.id];
      const progress = Math.round((idx / items.length) * 100);
      const hasPrev = idx > 0;
      const hasNext = true;

      // Récupérer les infos de section
      const sectionId = item.section || null;
      let sectionLabel = '';
      if (sectionId && config.sections) {
        const section = config.sections.find(s => s.id === sectionId);
        if (section) sectionLabel = section.title;
      }

      state.container.innerHTML = `
        <div class="tq-overlay">
          <div class="tq-modal">
            <div class="tq-header">
              <div class="tq-title">
                <span class="tq-icon">${config.title}</span>
                <span class="tq-subtitle">${config.fullName || ''}</span>
              </div>
              <button class="tq-close" id="tq-close" aria-label="Fermer">&times;</button>
            </div>

            <div class="tq-progress-wrap">
              <div class="tq-progress-bar">
                <div class="tq-progress-fill" style="width:${progress}%"></div>
              </div>
              <div class="tq-progress-label">Question ${idx+1}/${items.length}</div>
            </div>

            ${sectionLabel ? `<div class="tq-section-label">${sectionLabel}</div>` : ''}

            <div class="tq-body">
              <div class="tq-question-num">Q${idx+1}</div>
              <div class="tq-question-text">${item.text.replace(/\n/g, '<br>')}</div>
              <div class="tq-options" id="tq-options">
                ${renderOptions(item, currentVal, idx)}
              </div>
            </div>

            <div class="tq-footer">
              <div class="tq-nav">
                ${hasPrev ? '<button class="tq-btn tq-btn-secondary" id="tq-prev">← Précédent</button>' : '<div></div>'}
                ${idx < items.length - 1
                  ? '<button class="tq-btn tq-btn-primary" id="tq-next">Suivant →</button>'
                  : '<button class="tq-btn tq-btn-success" id="tq-finish">Voir les résultats ✓</button>'}
              </div>
            </div>
          </div>
        </div>
      `;

      // Événements
      const closeBtn = document.getElementById('tq-close');
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());

      const prevBtn = document.getElementById('tq-prev');
      if (prevBtn) prevBtn.addEventListener('click', () => this.goTo(idx - 1));

      const nextBtn = document.getElementById('tq-next');
      if (nextBtn) nextBtn.addEventListener('click', () => this.goTo(idx + 1));

      const finishBtn = document.getElementById('tq-finish');
      if (finishBtn) finishBtn.addEventListener('click', () => this.finish());

      // Changer les options en direct
      this.bindOptionEvents(item);

      // Sauvegarder progression
      HistoryManager.saveInProgress(config.id, idx, state.responses);
    },

    /**
     * Bind les événements sur les options pour mise à jour en direct
     */
    bindOptionEvents: function(item) {
      const state = this._state;
      
      if (item.type === 'criterion-multi' && item.subitems) {
        // Pour chaque sous-question, on bind individuellement
        item.subitems.forEach((_, si) => {
          const subId = item.id + '_' + si;
          document.querySelectorAll(`input[name="tq_${subId}"]`).forEach(el => {
            el.addEventListener('change', (e) => {
              const val = parseFloat(e.target.value);
              if (!state.responses[item.id]) {
                state.responses[item.id] = {};
              }
              state.responses[item.id][si] = val;
            });
          });
        });
        return;
      }

      // Standard : un seul input radio
      const radios = document.querySelectorAll(`input[name="tq_${item.id}"]`);
      radios.forEach(el => {
        el.addEventListener('change', (e) => {
          state.responses[item.id] = parseFloat(e.target.value);
          // Mettre à jour la classe selected
          document.querySelectorAll(`.tq-opt`).forEach(opt => opt.classList.remove('selected'));
          e.target.closest('.tq-opt')?.classList.add('selected');
        });
      });
    },

    /**
     * Va à une question spécifique
     */
    goTo: function(index) {
      const state = this._state;
      
      // Validation en quittant la question actuelle
      const currentItem = state.config.items[state.currentIndex];
      const currentResponses = getItemResponses(currentItem);
      
      if (currentItem) {
        if (currentItem.type === 'criterion-multi') {
          state.responses[currentItem.id] = currentResponses;
        } else {
          state.responses[currentItem.id] = currentResponses;
        }
      }

      // Vérifier que la question actuelle a une réponse pour avancer
      if (index > state.currentIndex) {
        const val = currentItem.type === 'criterion-multi'
          ? state.responses[currentItem.id]
          : currentResponses;
        
        if (!validateItem(currentItem, val)) {
          // Montrer l'erreur sans changer de question
          const opts = document.getElementById('tq-options');
          if (opts) {
            opts.classList.add('tq-error');
            setTimeout(() => opts.classList.remove('tq-error'), 800);
          }
          return;
        }
      }

      if (index >= 0 && index < state.totalItems) {
        state.currentIndex = index;
        this.render();
      }
    },

    /**
     * Termine le test et calcule les scores
     */
    finish: function() {
      const state = this._state;
      const config = state.config;

      // Collecter toutes les réponses du DOM pour la dernière question
      const lastItem = config.items[state.currentIndex];
      if (lastItem) {
        const lastResponses = getItemResponses(lastItem);
        if (lastItem.type === 'criterion-multi') {
          state.responses[lastItem.id] = lastResponses;
        } else {
          state.responses[lastItem.id] = lastResponses;
        }
      }

      // Aplatir les réponses pour le scoring engine
      // Les multi-items (borderline) { "bpd-1": {0: 1, 1: 0, ...} } → { "bpd-1_0": 1, "bpd-1_1": 0, ... }
      const flatResponses = {};
      for (const [key, val] of Object.entries(state.responses)) {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          // C'est un objet de sous-réponses
          for (const [subKey, subVal] of Object.entries(val)) {
            flatResponses[key + '_' + subKey] = subVal;
          }
        } else if (val !== null && val !== undefined) {
          flatResponses[key] = val;
        }
      }

      // Calculer les scores
      const result = ScoringEngine.scoreTest(config, flatResponses);

      // Sauvegarder l'historique
      HistoryManager.saveResult(result, config.id);

      // Effacer la progression
      HistoryManager.clearInProgress(config.id);

      // Appeler le callback
      if (state.onComplete) {
        state.onComplete(result);
      }

      state.started = false;
    },

    /**
     * Ferme le test sans sauvegarder
     */
    close: function() {
      const state = this._state;
      if (state.container) {
        state.container.innerHTML = '';
      }
      state.started = false;
    }
  };

  global.TestRunner = TestRunner;

})(typeof window !== 'undefined' ? window : this);
