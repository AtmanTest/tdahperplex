/**
 * scoring-engine.js — Moteur de scoring pur et testable
 * 
 * Prend une config de test + les réponses utilisateur → retourne un résultat structuré.
 * Aucune dépendance DOM. Testable unitairement.
 * 
 * Utilisation :
 *   const result = scoreTest(asrsConfig, { 'asrs-1': 3, 'asrs-2': 3, ... });
 *   // → { raw: 14, subscales: {...}, thresholds: [...], interpretation: {...} }
 */

(function(global) {
  'use strict';

  /**
   * Calcule le score pour un item en tenant compte des items inversés
   * @param {object} item - L'item de la config
   * @param {number} value - La valeur brute choisie par l'utilisateur
   * @param {object} config - La config complète du test (pour récupérer max option)
   * @returns {number} - La valeur scorée
   */
  function computeItemScore(item, value, config) {
    if (item.reversed) {
      // Trouver la valeur max des options
      const maxVal = Math.max(...item.options.map(o => o.value));
      return maxVal - value;
    }
    return value;
  }

  /**
   * Vérifie si une opération conditionnelle est vraie
   * @param {number} value - La valeur à comparer
   * @param {string} operator - gte, lte, eq
   * @param {number} threshold - Le seuil
   * @returns {boolean}
   */
  function compare(value, operator, threshold) {
    switch (operator) {
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq':  return value === threshold;
      case 'gt':  return value > threshold;
      case 'lt':  return value < threshold;
      default:    return false;
    }
  }

  /**
   * Calcule les scores pour toutes les sous-échelles
   * @param {object} config - La config du test
   * @param {object} responses - { itemId: value, ... }
   * @returns {object} - { subscaleKey: { raw, max, items, percent }, ... }
   */
  function computeSubscales(config, responses) {
    const subscaleResults = {};

    for (const [key, sub] of Object.entries(config.subscales || {})) {
      const items = sub.items || [];
      let sum = 0;
      let maxPossible = 0;
      let count = 0;

      for (const itemId of items) {
        const item = config.items.find(i => i.id === itemId);
        if (!item) continue;

        const response = responses[itemId];
        if (response !== undefined && response !== null) {
          count++;
          const scored = computeItemScore(item, response, config);
          sum += scored;
          const maxVal = Math.max(...item.options.map(o => o.value));
          const effectiveMax = item.reversed ? maxVal : maxVal;
          maxPossible += effectiveMax;
        }
      }

      subscaleResults[key] = {
        raw: sum,
        max: maxPossible,
        count,
        totalItems: items.length,
        percent: maxPossible > 0 ? Math.round((sum / maxPossible) * 100) : 0
      };
    }

    return subscaleResults;
  }

  /**
   * Évalue les règles de scoring
   * @param {object} config - La config du test
   * @param {object} responses - { itemId: value, ... }
   * @param {object} subscales - Résultat de computeSubscales
   * @returns {array} - [{ id, reached, description }, ...]
   */
  function evaluateRules(config, responses, subscales) {
    const rules = config.scoring?.rules || [];
    const results = [];

    for (const rule of rules) {
      let reached = false;
      let value = 0;

      switch (rule.type) {
        case 'total-sum': {
          // Somme de tous les items
          value = 0;
          for (const item of config.items) {
            const resp = responses[item.id];
            if (resp !== undefined && resp !== null) {
              value += computeItemScore(item, resp, config);
            }
          }
          reached = compare(value, rule.operator, rule.threshold);
          break;
        }
        case 'subscale-sum': {
          const ss = subscales[rule.subscale];
          value = ss ? ss.raw : 0;
          reached = compare(value, rule.operator, rule.threshold);
          break;
        }
        case 'subscale-item-count': {
          // Compte les items d'une sous-échelle qui dépassent un seuil
          const items = config.subscales?.[rule.subscale]?.items || [];
          let count = 0;
          for (const itemId of items) {
            const resp = responses[itemId];
            if (resp !== undefined && resp !== null && resp >= (config.scoring?.itemThreshold || rule.itemThreshold || 2)) {
              count++;
            }
          }
          value = count;
          reached = compare(value, rule.operator, rule.threshold);
          break;
        }
        case 'subscale-criterion-count': {
          // Pour borderline : chaque critère (sous-échelle) est présent si sa moyenne ≥ seuil
          const items = config.subscales?.[rule.subscale]?.items || [];
          let criterionCount = 0;
          for (const itemId of items) {
            const resp = responses[itemId];
            // L'item est un critère avec sous-questions (type: criterion-multi)
            const item = config.items.find(i => i.id === itemId);
            if (item && item.type === 'criterion-multi') {
              // Trouver les sous-réponses dans responses avec préfixe
              const subPrefix = itemId + '_';
              let subSum = 0;
              let subCount = 0;
              for (const [key, val] of Object.entries(responses)) {
                if (key.startsWith(subPrefix)) {
                  subSum += val;
                  subCount++;
                }
              }
              const avg = subCount > 0 ? subSum / subCount : 0;
              if (avg >= (rule.criterionThreshold || 0.6)) {
                criterionCount++;
              }
            } else {
              const resp = responses[itemId];
              if (resp !== undefined && resp !== null && resp >= (rule.criterionThreshold || 0.6)) {
                criterionCount++;
              }
            }
          }
          value = criterionCount;
          reached = compare(value, rule.operator, rule.threshold);
          break;
        }
        case 'item-value': {
          const resp = responses[rule.item];
          value = resp !== undefined && resp !== null ? resp : 0;
          reached = compare(value, rule.operator, rule.threshold);
          break;
        }
        default:
          break;
      }

      results.push({
        id: rule.id,
        description: rule.description,
        value,
        threshold: rule.threshold,
        operator: rule.operator,
        reached
      });
    }

    return results;
  }

  /**
   * Trouve l'interprétation correspondant au score total
   * @param {object} config - La config du test
   * @param {number} totalScore - Le score total
   * @returns {object} - L'interprétation correspondante
   */
  function findInterpretation(config, totalScore) {
    const interpretations = config.interpretations || [];
    // Trier par minScore
    interpretations.sort((a, b) => a.minScore - b.maxScore);

    for (const interp of interpretations) {
      if (totalScore >= interp.minScore && totalScore <= interp.maxScore) {
        return interp;
      }
    }
    // Fallback : dernière interprétation
    return interpretations[interpretations.length - 1] || null;
  }

  /**
   * Calcule le score total brut (tous les items)
   * @param {object} config - La config du test
   * @param {object} responses - { itemId: value, ... }
   * @returns {number}
   */
  function computeTotalRaw(config, responses) {
    let total = 0;
    for (const item of config.items) {
      const resp = responses[item.id];
      if (resp !== undefined && resp !== null) {
        total += computeItemScore(item, resp, config);
      }
    }
    return total;
  }

  /**
   * Calcule le max possible
   * @param {object} config - La config du test
   * @returns {number}
   */
  function computeTotalMax(config) {
    let max = 0;
    for (const item of config.items) {
      const maxVal = Math.max(...item.options.map(o => o.value));
      max += item.reversed ? maxVal : maxVal;
    }
    return max;
  }

  /**
   * Fonction PRINCIPALE : scoreTest
   * 
   * @param {object} config - La config JSON complète du test
   * @param {object} responses - { itemId: selectedValue, ... }
   *        Pour les critères multi-items (borderline) : { "bpd-1_0": 1, "bpd-1_1": 0, ... }
   * @returns {object} {
   *   raw: number,              // Score total brut
   *   max: number,              // Score maximum possible
   *   percent: number,          // Pourcentage
   *   subscales: object,        // Scores par sous-échelle
   *   thresholds: array,        // Résultats des règles de scoring
   *   interpretation: object,   // Interprétation correspondante
   *   warnings: array,          // Alertes (item critique, etc.)
   *   complexPassed: boolean|null  // Pour les tests avec complexThreshold (MDQ)
   * }
   */
  function scoreTest(config, responses) {
    const subscales = computeSubscales(config, responses);
    const thresholds = evaluateRules(config, responses, subscales);
    const totalRaw = computeTotalRaw(config, responses);
    const totalMax = computeTotalMax(config);
    
    const interpretation = findInterpretation(config, totalRaw);

    // Alertes sur items critiques
    const warnings = [];
    for (const item of config.items) {
      if (item.critical) {
        const resp = responses[item.id];
        if (resp !== undefined && resp !== null && resp > 0) {
          warnings.push({
            itemId: item.id,
            text: item.text,
            alert: item.alert || null,
            value: resp
          });
        }
      }
      // Sous-items critiques (borderline critère 5)
      if (item.alert) {
        const subPrefix = item.id + '_';
        let hasAlert = false;
        for (const [key, val] of Object.entries(responses)) {
          if (key.startsWith(subPrefix) && val > 0) {
            hasAlert = true;
          }
        }
        if (hasAlert) {
          warnings.push({
            itemId: item.id,
            text: item.text,
            alert: item.alert || 'Comportement à risque signalé',
            value: 1
          });
        }
      }
    }

    // Complex threshold (MDQ: AND entre plusieurs règles)
    let complexPassed = null;
    if (config.scoring?.complexThreshold?.and) {
      const andRuleIds = config.scoring.complexThreshold.and;
      complexPassed = andRuleIds.every(ruleId => {
        const rule = thresholds.find(t => t.id === ruleId);
        return rule && rule.reached;
      });
    }

    return {
      raw: totalRaw,
      max: totalMax,
      percent: totalMax > 0 ? Math.round((totalRaw / totalMax) * 100) : 0,
      subscales,
      thresholds,
      interpretation,
      warnings,
      complexPassed,
      config
    };
  }

  // Export
  global.ScoringEngine = {
    scoreTest,
    computeItemScore,
    computeSubscales,
    evaluateRules,
    findInterpretation
  };

})(typeof window !== 'undefined' ? window : this);
