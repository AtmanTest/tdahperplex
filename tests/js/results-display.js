/**
 * results-display.js — Affichage des résultats + graphiques + export
 * 
 * Affiche les résultats d'un test avec :
 * - Score total + barre de progression
 * - Scores par sous-échelle (barres ou radar)
 * - Interprétation textuelle
 * - Disclaimer
 * - Bouton export PDF
 * - Historique des tests passés
 */

(function(global) {
  'use strict';

  const ResultsDisplay = {

    /**
     * Affiche les résultats dans un conteneur
     * @param {object} result - Résultat de scoreTest()
     * @param {HTMLElement} container
     */
    show: function(result, container) {
      if (!result || !container) return;

      const config = result.config || {};
      const subscales = result.subscales || {};
      const interp = result.interpretation || {};
      const warnings = result.warnings || [];
      const thresholds = result.thresholds || [];

      // Compter les seuils atteints
      const thresholdsReached = thresholds.filter(t => t.reached).length;
      const thresholdsTotal = thresholds.length;

      let html = '<div class="tr-results">';

      // === HEADER ===
      html += `
        <div class="tr-header">
          <div class="tr-header-top">
            <span class="tr-badge">${config.title || ''}</span>
            <span class="tr-date">${new Date().toLocaleDateString('fr-FR')}</span>
          </div>
          <h2 class="tr-title">Résultats</h2>
        </div>
      `;

      // === SCORE PRINCIPAL ===
      html += `
        <div class="tr-score-card" style="border-left:4px solid ${interp.color || '#888'}">
          <div class="tr-score-main">
            <div class="tr-score-number" style="color:${interp.color || '#888'}">
              ${result.raw}<span class="tr-score-max">/${result.max}</span>
            </div>
            <div class="tr-score-label" style="color:${interp.color || '#888'}">
              ${interp.label || 'Résultat'}
            </div>
          </div>
          <div class="tr-score-bar-wrap">
            <div class="tr-score-bar">
              <div class="tr-score-fill" style="width:${result.percent}%;background:${interp.color || '#888'}"></div>
            </div>
            <div class="tr-score-percent">${result.percent}%</div>
          </div>
        </div>
      `;

      // === SEUILS ===
      if (thresholds.length > 0) {
        html += '<div class="tr-section"><h3 class="tr-section-title">Seuils cliniques</h3>';
        // Voir si test a un complexThreshold (MDQ)
        if (result.complexPassed !== null) {
          html += `
            <div class="tr-threshold-card ${result.complexPassed ? 'tr-pass' : 'tr-fail'}">
              <span class="tr-threshold-icon">${result.complexPassed ? '✓' : '✗'}</span>
              <div>
                <strong>Dépistage global : ${result.complexPassed ? 'POSITIF' : 'NÉGATIF'}</strong>
                <div class="tr-threshold-desc">${config.scoring?.complexThreshold?.description || ''}</div>
              </div>
            </div>
          `;
        }
        thresholds.forEach(t => {
          html += `
            <div class="tr-threshold-card ${t.reached ? 'tr-pass' : 'tr-fail'}">
              <span class="tr-threshold-icon">${t.reached ? '✓' : '✗'}</span>
              <div>
                <strong>${t.reached ? 'Seuil atteint' : 'Seuil non atteint'}</strong>
                <div class="tr-threshold-desc">${t.description} (${t.value}/${t.threshold})</div>
              </div>
            </div>
          `;
        });
        html += '</div>';
      }

      // === SOUS-ÉCHELLES ===
      const subKeys = Object.keys(subscales);
      if (subKeys.length > 1 || (subKeys.length === 1 && subKeys[0] !== 'total' && subKeys[0] !== 'criteria')) {
        html += '<div class="tr-section"><h3 class="tr-section-title">Scores par domaine</h3>';
        
        // Graphique à barres
        html += '<div class="tr-bars">';
        for (const [key, ss] of Object.entries(subscales)) {
          const label = config.subscales?.[key]?.label || key;
          const pct = ss.percent || 0;
          const color = pct > 66 ? '#b85a42' : pct > 33 ? '#b8a042' : '#5b8b6a';
          html += `
            <div class="tr-bar-item">
              <div class="tr-bar-label">${label}</div>
              <div class="tr-bar-track">
                <div class="tr-bar-fill" style="width:${pct}%;background:${color}"></div>
              </div>
              <div class="tr-bar-value">${ss.raw}/${ss.max}</div>
            </div>
          `;
        }
        html += '</div>';

        // Graphique radar (canvas) si ≥ 2 sous-échelles
        if (subKeys.length >= 2) {
          html += '<div class="tr-chart-wrap"><canvas id="tr-radar" width="300" height="300"></canvas></div>';
        }
        
        html += '</div>';
      }

      // === INTERPRÉTATION ===
      html += `
        <div class="tr-section">
          <h3 class="tr-section-title">Interprétation</h3>
          <div class="tr-interp-card" style="border-left:4px solid ${interp.color || '#888'}">
            <p>${interp.text || ''}</p>
            ${interp.recommendation ? `<p class="tr-reco"><strong>Recommandation :</strong> ${interp.recommendation}</p>` : ''}
          </div>
        </div>
      `;

      // === ALERTES (items critiques) ===
      if (warnings.length > 0) {
        html += '<div class="tr-section"><h3 class="tr-section-title tr-alert-title">⚠ Alertes</h3>';
        warnings.forEach(w => {
          html += `
            <div class="tr-alert-card">
              <p><strong>Attention :</strong> ${w.alert || 'Réponse nécessitant une attention particulière'}</p>
            </div>
          `;
        });
        html += '</div>';
      }

      // === DISCLAIMER ===
      html += `
        <div class="tr-disclaimer">
          <strong>⚠ Important</strong>
          <p>${config.disclaimer || 'Ce questionnaire est un outil de sensibilisation et de dépistage, pas un outil diagnostique. Il ne remplace en aucun cas une évaluation clinique par un professionnel de santé qualifié.'}</p>
          ${warnings.some(w => w.alert?.includes('3114') || w.alert?.includes('suicide')) ? 
            '<p class="tr-urgent">🔴 Si vous avez des pensées suicidaires, appelez immédiatement le <strong>3114</strong> (ligne nationale de prévention du suicide, 24h/24).</p>' : ''}
        </div>
      `;

      // === BOUTONS D'ACTION ===
      html += `
        <div class="tr-actions">
          <button class="tq-btn tq-btn-secondary" id="tr-retry">🔄 Refaire ce test</button>
          <button class="tq-btn tq-btn-primary" id="tr-export-pdf">📥 Exporter en PDF</button>
          <button class="tq-btn tq-btn-primary" id="tr-export-img">📷 Capturer l'image</button>
        </div>
      `;

      // === HISTORIQUE ===
      const history = HistoryManager.getByTest(config.id);
      if (history.length > 1) {
        html += '<div class="tr-section"><h3 class="tr-section-title">Historique</h3>';
        html += '<div class="tr-history">';
        history.forEach((entry, i) => {
          html += `
            <div class="tr-history-item">
              <div class="tr-h-date">${entry.dateLocale || 'Date inconnue'}</div>
              <div class="tr-h-score" style="color:${entry.color || '#888'}">${entry.raw}/${entry.max}</div>
              <div class="tr-h-label">${entry.label || ''}</div>
              ${i === 0 ? '<span class="tr-h-badge">Dernier</span>' : ''}
            </div>
          `;
        });
        html += '</div></div>';
      }

      html += '</div>'; // fin tr-results

      container.innerHTML = html;

      // === INITIALISATION DES ÉVÉNEMENTS ===
      document.getElementById('tr-retry')?.addEventListener('click', () => {
        // Fermer les résultats et relancer le test
        const section = document.getElementById('tests');
        if (section) {
          const testContainer = document.getElementById('test-container');
          if (testContainer) {
            testContainer.innerHTML = '';
            section.scrollIntoView({ behavior: 'smooth' });
            initTest(config.id, testContainer);
          }
        }
      });

      // Export PDF (via impression navigateur)
      document.getElementById('tr-export-pdf')?.addEventListener('click', () => {
        window.print();
      });

      // Export image (capture canvas)
      document.getElementById('tr-export-img')?.addEventListener('click', () => {
        const resultsEl = container.querySelector('.tr-results');
        if (resultsEl) {
          // Utiliser html2canvas si disponible, sinon fallback
          if (typeof html2canvas !== 'undefined') {
            html2canvas(resultsEl).then(canvas => {
              const link = document.createElement('a');
              link.download = `${config.id}-resultats.png`;
              link.href = canvas.toDataURL();
              link.click();
            });
          } else {
            // Fallback : suggestion d'impression
            alert('Pour capturer vos résultats : utilisez "Imprimer" (Ctrl+P) et choisissez "Enregistrer au format PDF" ou faites une capture d\'écran.');
          }
        }
      });

      // === DESSIN DU RADAR ===
      if (subKeys.length >= 2) {
        this.drawRadar(subscales, config, container);
      }
    },

    /**
     * Dessine un graphique radar sur le canvas
     */
    drawRadar: function(subscales, config, container) {
      const canvas = document.getElementById('tr-radar');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.35;
      const keys = Object.keys(subscales);
      const count = keys.length;
      const angleStep = (2 * Math.PI) / count;

      ctx.clearRect(0, 0, w, h);

      // Fond transparent
      ctx.fillStyle = 'rgba(255,255,255,0)';
      ctx.fillRect(0, 0, w, h);

      // Grille
      for (let level = 1; level <= 4; level++) {
        const r = (radius * level) / 4;
        ctx.beginPath();
        for (let i = 0; i <= count; i++) {
          const angle = -Math.PI / 2 + i * angleStep;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(200,200,210,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Axes
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + i * angleStep;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        ctx.strokeStyle = 'rgba(200,200,210,0.4)';
        ctx.stroke();
      }

      // Labels
      ctx.fillStyle = '#555571';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + i * angleStep;
        const labelR = radius + 28;
        const x = cx + labelR * Math.cos(angle);
        const y = cy + labelR * Math.sin(angle);
        const label = (config.subscales?.[keys[i]]?.label || keys[i]).split(' — ')[0];
        // Truncate
        const shortLabel = label.length > 18 ? label.substring(0, 16) + '…' : label;
        ctx.fillText(shortLabel, x, y);
      }

      // Score data
      const scores = keys.map(k => subscales[k]?.percent || 0);
      
      // Remplissage
      ctx.beginPath();
      for (let i = 0; i <= count; i++) {
        const idx = i % count;
        const angle = -Math.PI / 2 + idx * angleStep;
        const r = (scores[idx] / 100) * radius;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(59, 91, 140, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#3b5b8c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Points
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + i * angleStep;
        const r = (scores[i] / 100) * radius;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b5b8c';
        ctx.fill();
      }
    },

    /**
     * Affiche un message d'erreur
     */
    showError: function(message, container) {
      if (container) {
        container.innerHTML = `
          <div class="tq-error-msg">
            <p>⚠ ${message}</p>
            <button class="tq-btn tq-btn-primary" onclick="this.closest('.tq-error-msg').remove()">Fermer</button>
          </div>
        `;
      }
    }
  };

  global.ResultsDisplay = ResultsDisplay;

})(typeof window !== 'undefined' ? window : this);
