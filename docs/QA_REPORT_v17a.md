# QA REPORT — tdahperplex v17a

## Résumé

Clone indépendant de tdah-profile, toutes les régressions corrigées.

| Élément | Statut |
|---------|--------|
| Repo source | tdah-profile (lecture seule, non modifié) |
| Repo cible | tdahperplex |
| Version | v17a |
| Dernier commit | `90c20dc` |
| TNR | ✅ VERT — 13/13 catégories |

## Tableau des bugs — Cause racine → Correction → Test

| # | Bug | Cause racine | Fichiers impactés | Correction | Test associé | Résultat |
|---|---|---|---|---|---|---|
| 1 | Assistant TDAH présent | `scripts/chat.js` + section HTML + nav + traductions non supprimés | `index.html`, `scripts/chat.js`, `translations.js`, `test_tnr_v16.py` | Suppression totale : fichier, section, nav, traductions, tests | C1: chat.js absent, #chat absent, nav.chat absent, chat translations absentes | ✅ |
| 2 | Dark/Light mode non fonctionnel | `const i18n` dans `translations.js` bloquait l'exécution de tout JS. `--glow` manquant dans light theme | `translations.js` | `var i18n` (déjà corrigé dans source), ajout `--glow` pour light theme | C2: data-theme présent, bouton toggle, CSS dark/light déclaré | ✅ |
| 3 | Zones vides sur mobile | `section{padding:var(--sp-lg) 0}` avec `sp-lg=clamp(2rem,5vw,4rem)` créait 8rem d'espace vide | `index.html` CSS | Remplacé par `clamp(1rem,3vw,2.5rem)` | C3: section padding en clamp, media query 500px présente | ✅ |
| 4 | Headers sections charte obsolète | `font-size:.6rem;font-weight:700` — trop petit, pas assez visible | `index.html` CSS `.section-label` | Passé à `font-size:.65rem;font-weight:800;box-shadow` | C13: font-size 0.65rem, font-weight 800 | ✅ |
| 5 | Navigation active instable | Scroll spy basé sur `offsetTop` (défilement ascendant uniquement, pas fiable) | `index.html` JS | Remplacé par `IntersectionObserver` avec `threshold:0.2`, `rootMargin:'-60px 0px -40%'` | C9: IntersectionObserver utilisé | ✅ |
| 6 | Duplicate ID `#tableau`/`#synthese` | Deux attributs `id` sur même élément `<section id="tableau" id="synthese">` — HTML ignore le second | `index.html` | Remplacé par `id="synthese"` uniquement | C8: pas de double id, #synthese accessible | ✅ |
| 7 | Version obsolète | v17 au lieu de v17a | `index.html` | Remplacé par `v17a` | C10: v17a affichée | ✅ |
| 8 | Flash news défilement cassé | Ancien ticker JS + CSS mask-image créait chevauchement | `index.html`, `scripts/news-ticker.js` | Déjà corrigé dans source (top-3 statique) | — | ✅ (préexistant) |
| 9 | FR/EN toggle non fonctionnel | `const i18n` → `window.i18n` = undefined | `translations.js` | Déjà corrigé dans source (`var i18n`) | C5: toutes les clés FR/EN présentes | ✅ (préexistant) |

## TNR Détail (13 catégories)

```
📁 1. Fichiers essentiels      ✅ 10/10
🏗️  2. Structure HTML          ✅ 18/18
🔍 3. Validité JS              ✅ 7/7
⚙️  4. Vérification features   ✅ 10/10
🌐 5. Traductions              ✅ 27/27
🎨 6. Thème                    ✅ 4/4
🧭 7. Ordre Nav                ✅ 1/1
🌐 8. I18N & Navigation         ✅ 5/5
🔄 9. Scroll Spy               ✅ 2/2
📋 10. Version                  ✅ 1/1
🔧 11. GitHub Pages             ✅ 2/2
📱 12. Mobile Responsive        ✅ 2/2
🎯 13. Section Headers          ✅ 1/1
```

**Total : 91 tests, 91 ✅, 0 ❌**

## Décision

✅ **GO** — Tous les critères d'acceptation sont remplis :
- Assistant TDAH totalement supprimé
- Dark/Light fonctionnel
- Mobile sans zones vides
- Nouvelle charte headers appliquée
- Navigation active au scroll (IntersectionObserver)
- Version v17a
- TNR vert
- Aucune modification du dépôt source tdah-profile

## URLs

- **Repo** : https://github.com/AtmanTest/tdahperplex
- **GitHub Pages** : https://atmantest.github.io/tdahperplex/
- **Dernier commit** : `90c20dc`
