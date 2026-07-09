/**
 * test-history.js — Gestion de l'historique des tests (localStorage)
 * 
 * Sauvegarde et restaure l'historique des tests passés.
 * Chaque entrée : { testId, date, raw, percent, level, subscales }
 * 
 * Stockage : localStorage key 'tdah_test_history'
 * État en cours : 'tdah_test_in_progress_{testId}'
 */

(function(global) {
  'use strict';

  const STORAGE_KEY = 'tdah_test_history';
  const IN_PROGRESS_PREFIX = 'tdah_test_in_progress_';

  const HistoryManager = {

    /**
     * Sauvegarde un résultat dans l'historique
     * @param {object} result - Le résultat de scoreTest()
     * @param {string} testId - L'ID du test
     */
    saveResult: function(result, testId) {
      const history = this.getAll();
      const entry = {
        testId: testId,
        date: new Date().toISOString(),
        dateLocale: new Date().toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }),
        raw: result.raw,
        max: result.max,
        percent: result.percent,
        level: result.interpretation?.level || 'inconnu',
        label: result.interpretation?.label || '',
        color: result.interpretation?.color || '#888',
        subscales: result.subscales || {},
        thresholds: (result.thresholds || []).map(t => ({
          id: t.id,
          description: t.description,
          reached: t.reached
        })),
        warnings: result.warnings || []
      };
      
      // Ajouter au début
      history.unshift(entry);
      
      // Limiter à 50 entrées max
      if (history.length > 50) history.length = 50;
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      return entry;
    },

    /**
     * Récupère tout l'historique
     * @returns {array}
     */
    getAll: function() {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        return [];
      }
    },

    /**
     * Récupère l'historique pour un test spécifique
     * @param {string} testId
     * @returns {array}
     */
    getByTest: function(testId) {
      return this.getAll().filter(e => e.testId === testId);
    },

    /**
     * Supprime une entrée de l'historique
     * @param {number} index - Index dans le tableau
     */
    removeEntry: function(index) {
      const history = this.getAll();
      if (index >= 0 && index < history.length) {
        history.splice(index, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      }
    },

    /**
     * Efface tout l'historique
     */
    clearAll: function() {
      localStorage.removeItem(STORAGE_KEY);
    },

    // ---- État en cours (sauvegarde de progression) ----

    /**
     * Sauvegarde l'état actuel d'un test en cours
     * @param {string} testId
     * @param {number} currentIndex
     * @param {object} responses
     */
    saveInProgress: function(testId, currentIndex, responses) {
      const key = IN_PROGRESS_PREFIX + testId;
      localStorage.setItem(key, JSON.stringify({
        testId,
        currentIndex,
        responses,
        timestamp: Date.now()
      }));
    },

    /**
     * Récupère l'état en cours d'un test
     * @param {string} testId
     * @returns {object|null}
     */
    getInProgress: function(testId) {
      try {
        const key = IN_PROGRESS_PREFIX + testId;
        const data = localStorage.getItem(key);
        if (!data) return null;
        const state = JSON.parse(data);
        // Expire après 24h
        if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
          this.clearInProgress(testId);
          return null;
        }
        return state;
      } catch (e) {
        return null;
      }
    },

    /**
     * Efface l'état en cours d'un test
     * @param {string} testId
     */
    clearInProgress: function(testId) {
      localStorage.removeItem(IN_PROGRESS_PREFIX + testId);
    }
  };

  global.HistoryManager = HistoryManager;

})(typeof window !== 'undefined' ? window : this);
