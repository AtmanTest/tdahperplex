# Audit Complet — Dépôt TDAH Profile

## Architecture du Projet

### Stack Technique
- **Static Site** : HTML5 + CSS3 (variables CSS) + Vanilla JS (IIFE pattern)
- **Déploiement** : GitHub Pages via `gh-pages` (`.nojekyll` présent)
- **Zéro dépendance npm** : pas de bundler, pas de framework
- **Parsistance locale** : `localStorage` pour scores, planner, tracker, témoignages, chat, langue, thème
- **CI** : GitHub Actions (1 workflow daily-news.yml)

### Structure des fichiers

```
tdah-profile/
├── index.html                 # 1861 lignes — tout le site
├── translations.js            # 700+ lignes — trad FR/EN (var i18n)
├── news.json                  # Feed actualités (30 articles)
├── test_tnr_v16.py            # Tests de non-régression Python
├── create_op_tickets.rb       # Script Ruby (outil dev)
├── .nojekyll                  # GitHub Pages
├── .github/workflows/
│   └── daily-news.yml         # Cron quotidien pour fetch RSS
├── scripts/
│   ├── i18n.js                # Chargeur de langue (FR/EN)
│   ├── news-ticker.js         # Top-3 actualités (banner + liste)
│   ├── fetch-news.js          # Node.js RSS fetcher (GitHub Actions)
│   ├── dashboard.js           # Radar chart + scores
│   ├── chat.js                # Assistant IA DeepSeek (floating widget)
│   ├── pdf-print.js           # Génération PDF A4
│   ├── planner.js             # Planificateur rendez-vous
│   ├── tracker.js             # Suivi médicamenteux
│   └── testimonials.js        # FAQ + Témoignages
└── tests/
    ├── config/
    │   ├── manifest.json      # Catalogue des 6 tests
    │   ├── asrs.json, wurs.json, bdi2.json, mdq.json, borderline.json, diva.json
    └── js/
        ├── test-runner.js
        ├── scoring-engine.js
        ├── results-display.js
        └── test-history.js
```

### Ordre de chargement des scripts

```html
<head>
  <script src="translations.js"></script>    <!-- 1: var i18n global -->
  ... inline CSS ...
</head>
<body>
  ...
  <!-- Inline: Tests diagnostics (1692-1803) -->
  <script src="scripts/news-ticker.js"></script>
  <!-- Inline: Scroll spy (1808-1832) -->
  <!-- Inline: Theme toggle (1835-1850) -->
  <script src="scripts/dashboard.js"></script>
  <script src="scripts/chat.js"></script>
  <script src="scripts/pdf-print.js"></script>
  <script src="scripts/planner.js"></script>
  <script src="scripts/tracker.js"></script>
  <script src="scripts/testimonials.js"></script>
  <script src="scripts/i18n.js"></script>   <!-- DERNIER: applique les trad -->
</body>
```

### IDs et variables utilisés

| Élément | ID / Variable |
|---------|--------------|
| Navigation | `#resume`, `#chronologie`, `#symptomes`, `#exemples`, `#impacts`, `#pourquoi`, `#dialogue`, `#tests`, `#psychiatre`, `#synthese`/`#tableau`, `#dashboard`, `#chat`, `#pdf`, `#planner`, `#tracker`, `#community`, `#actualites` |
| Lang toggle | `#lang-toggle` (attributs `data-lang`, `data-lang-active`) |
| Theme toggle | `#theme-toggle` |
| Dashboard | `#dashboard-app`, `#dash-radar`, `#dash-input-*`, `#dash-summary-text`, `#dash-reset` |
| Chat | `#chat-key-setup`, `#chat-messages` (inutilisés par JS), `.chat-overlay`, `.chat-button` (générés) |
| PDF | `#pdf-generate-btn` |
| Planner | `#planner-app` |
| Tracker | `#tracker-app` |
| Community | `#faq-app`, `#testimonials-app` |
| News | `#news-banner`, `#news-ticker`, `#news-list`, `#news-filters` |
| Tests | `#test-container`, `#test-grid`, `#test-results` |
| CSS | `data-theme="dark"`/`"light"` sur `<html>` |
| localStorage | `tdah_lang`, `tdah_theme`, `tdah_dashboard_scores`, `tdah_deepseek_key`, `tdah_chat_messages`, `tdah_planner`, `tdah_tracker`, `tdah_testimonials` |

---

## BUGS IDENTIFIÉS

### BUG 1 (CRITIQUE) — Duplicate `id` sur section #synthese

**Fichier** : `index.html` — ligne 1512  
**Code** : `<section id="tableau" id="synthese">`  
**Cause racine** : Deux attributs `id` sur le même élément. HTML valide uniquement le premier (`tableau`), le second (`synthese`) est ignoré silencieusement par le parseur.  
**Impact** : Le lien de navigation `<a href="#synthese">Synthèse</a>` ne fait défiler nulle part car `#synthese` ne correspond à aucun élément.  
**Correction** : Remplacer par `<section id="synthese">` et supprimer `id="tableau"`, ou utiliser `<a name="synthese">` en complément.

### BUG 2 (CRITIQUE) — Chat construit une UI flottante indépendante, ignorant la section #chat

**Fichier** : `scripts/chat.js` (lignes 277-340)  
**Cause racine** : `chat.js` crée son propre overlay flottant (`.chat-button` + `.chat-overlay`) via `buildUI()` et les attache à `document.body`. Les éléments HTML `#chat-key-setup` et `#chat-messages` dans la section `#chat` sont morts — jamais utilisés par le JS.  
**Impact** : 
- La section `#chat` dans la page est vide/invisible
- Un bouton flottant apparaît en bas à droite sur TOUTES les pages, pas seulement dans la section chat
- Double UI : l'utilisateur voit à la fois la section #chat (vide) et le widget flottant
- Confusion : le contenu HTML de la section #chat n'est jamais rendu visible  
**Correction** : Soit (a) supprimer toute la section `#chat` de `index.html` et le bouton flottant (si l'assistant doit être totalement supprimé), soit (b) faire pointer `chat.js` vers les conteneurs HTML existants au lieu d'en créer de nouveaux.

### BUG 3 (MOYEN) — Chat.js ne respecte pas le système de thème du site

**Fichier** : `scripts/chat.js` — lignes 234-248  
**Code** : 
```css
@media (prefers-color-scheme: dark) {
  :root { --chat-bg: #1f2937; --chat-text: #f3f4f6; ... }
}
```  
**Cause racine** : chat.js injecte ses propres variables CSS via `@media (prefers-color-scheme: dark)` qui ne tient pas compte du `data-theme` du site.  
**Impact** : Si l'OS est en dark mode mais le site en light mode (ou vice versa), les couleurs du chat sont incohérentes avec le reste de la page.  
**Correction** : Remplacer la media query par une écoute de l'attribut `data-theme` sur `<html>`, ou utiliser les variables CSS du site (`var(--surface)`, `var(--text)`, etc.).

### BUG 4 (MOYEN) — CSS ticker-scroll : code mort

**Fichier** : `index.html` — lignes 694-697  
**Code** : 
```css
@keyframes ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```  
**Cause racine** : `news-ticker.js` a été réécrit pour afficher un top-3 statique (plus de défilement), mais l'animation CSS de l'ancien ticker rotatif n'a pas été supprimée. Ce sélecteur n'est référencé nulle part dans le JS ni dans le HTML.  
**Impact** : ~40 octets de CSS mort, sans conséquence fonctionnelle.  
**Correction** : Supprimer les lignes 694-697 du CSS dans `index.html`.

### BUG 5 (MOYEN) — Gros script inline dans le body

**Fichier** : `index.html` — lignes 1692-1803  
**Cause racine** : L'initialisation du test runner (~110 lignes JS) est inline dans index.html.  
**Impact** : Bloque le rendu, difficile à maintenir, pas de cache possible.  
**Correction** : Externaliser dans `scripts/test-runner-init.js` ou similaire.

### BUG 6 (MOYEN) — FOUC (Flash of Untranslated Content)

**Fichier** : `scripts/i18n.js`  
**Cause racine** : `i18n.js` est chargé en dernier (ligne 1859). Tout le contenu HTML a déjà été rendu en français (valeurs par défaut des `data-i18n`), puis i18n.js applique la langue sauvegardée, causant un flash visuel.  
**Impact** : L'utilisateur voit brièvement le contenu en français avant la bascule vers l'anglais (si anglais était sauvegardé).  
**Correction** : Appliquer la langue immédiatement après `<body>` avec un script inline minimal, ou charger `i18n.js` plus tôt.

### BUG 7 (MINEUR) — toggle FR/EN : styling inline fragile

**Fichier** : `index.html` — ligne 894  
**Cause racine** : Le bouton de langue utilise du style inline (`style="text-decoration:none;font-size:.85rem;..."`) au lieu de classes CSS.  
**Impact** : Difficile à maintenir, pas cohérent avec le reste du design.  
**Correction** : Utiliser une classe CSS dédiée.

---

## État des 9 bugs demandés

| # | Bug | Statut | Commentaire |
|---|-----|--------|-------------|
| 1 | Assistant TDAH (old Gemini Chat) — supprimé ? | ❌ **Présent** | `chat.js` + section `#chat` existent toujours. À supprimer si demandé. |
| 2 | Dark/Light mode — toggle ne fonctionne pas | ✅ **Fonctionnel** | Le toggle (lignes 1835-1850) lit/écrit localStorage, bascule `data-theme`. `var i18n` déjà utilisé (pas `const`). |
| 3 | Mobile — zones vides sous sections | ⚠️ **Layout OK** | Les sections alternent bg via sélecteurs `#id`. Pas de zones vides flagrantes. Nav responsive (breakpoint 500px). |
| 4 | Headers sections — charte couleurs | ✅ **OK** | `.section-label` utilise `var(--accent)` + `var(--accent-light)` partout. |
| 5 | Scroll spy — navigation active | ⚠️ **Bogué** | Défile de bas en haut mais condition `offsetTop <= scrollY` peut manquer des sections au scroll inverse. Fonctionnel mais imparfait. |
| 6 | Flash news — défilement cassé | ✅ **Remplacé** | `news-ticker.js` affiche désormais top-3 statique. L'ancien CSS `ticker-scroll` (B#4) est mort mais inoffensif. |
| 7 | Version inexistante/invisible | ✅ **Visible** | `<span class="logo-version"><strong>v17</strong></span>` (ligne 891) |
| 8 | Section backgrounds — aucun fond distinct | ✅ **OK** | 17 sections avec `background` alterné : `var(--surface)` / `var(--bg)` via sélecteurs `#id`. |
| 9 | FR/EN toggle — ne fonctionnait pas (const→var) | ✅ **Corrigé** | `translations.js` ligne 6 : `var i18n = {` (pas `const`). Le toggle fonctionne via `i18n.js`. |

---

## Fichiers à supprimer / modifier / créer

### À supprimer (si suppression totale de l'assistant TDAH)
1. **`scripts/chat.js`** — L'ancien assistant Gemini/DeepSeek (594 lignes)
2. **Section `#chat` dans `index.html`** (lignes 1615-1622) et son lien de navigation (ligne 910)
3. **Clés de traduction chat** dans `translations.js` (`nav.chat`, `chat.intro`, `sec.chat`, `h2.chat`)

### À modifier
1. **`index.html`** ligne 1512 : corriger le double `id="tableau" id="synthese"` → `id="synthese"`
2. **`index.html`** lignes 694-697 : supprimer `@keyframes ticker-scroll` (CSS mort)
3. **`index.html`** lignes 1692-1803 : externaliser le script inline du test runner
4. **`scripts/chat.js`** lignes 234-248 : corriger le thème dark pour utiliser `data-theme`
5. **`index.html`** ligne 894 : remplacer style inline par classe CSS pour le lang toggle

### À créer
1. **`scripts/test-runner-init.js`** — Extraire le script inline des lignes 1692-1803

---

## Erreurs console potentielles

1. **`#synthese` scroll échoue** : `id="synthese"` ignoré → le scroll vers `#synthese` ne fonctionne pas, mais pas d'erreur console (c'est silencieux).
2. **Chat.js** : Si `localStorage` est vide pour la clé API, la fonction `showKeyPrompt()` s'exécute normalement. Pas d'erreur.
3. **news-ticker.js** : Si `news.json` est inaccessible, affiche "Actualités indisponibles" — pas d'erreur console fatale.
4. **Dashboard.js** : Si le canvas `#dash-radar` est manquant, `drawRadar()` retourne silencieusement.
5. **i18n.js** : Si `i18n` global est indéfini (translations.js pas chargée), `applyLang()` retourne silencieusement.
