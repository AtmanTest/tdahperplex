# tdahperplex 🧠

Profil TDAH — auto-évaluation interactive, tests diagnostiques et suivi thérapeutique.

Clone de test indépendant de [tdah-profile](https://github.com/AtmanTest/tdah-profile), version **v17a**.

## Stack

- HTML5 + CSS3 (variables CSS) + Vanilla JS
- Pas de dépendances, pas de bundler
- Déploiement : GitHub Pages

## Utilisation

Ouvrir `index.html` dans un navigateur, ou visiter :

👉 **https://atmantest.github.io/tdahperplex/**

## Fonctionnalités

- **Tests diagnostiques** : DIVA 2.0, WURS-61, ASRS, BDI-II, MDQ, Borderline
- **Dashboard** : radar chart des scores, calcul automatique
- **Générateur PDF** : export du profil complet
- **Planificateur** : gestion des rendez-vous (localStorage)
- **Suivi médicamenteux** : tracker quotidien
- **FAQ / Communauté** : témoignages et questions fréquentes
- **Actualités TDAH** : flux RSS agrégé
- **Thème Dark/Light** : toggle avec persistance
- **i18n FR/EN** : bascule français/anglais
- **Scroll spy** : navigation active au défilement (IntersectionObserver)
- **Responsive** : desktop et mobile

## Version

v17a (build incrémental : v16 → v17a)

## Procédure de release

1. Modifier la version dans `index.html` (`.logo-version strong`)
2. Exécuter les tests : `python3 test_tnr_v16.py`
3. TNR vert obligatoire avant push
4. Commit + push sur `main`
5. GitHub Pages déploie automatiquement

## Tests

```bash
python3 test_tnr_v16.py
```

13 catégories de tests : fichiers, structure HTML, validité JS, features, traductions, thème, ordre nav, i18n, scroll spy, version, GitHub Pages, responsive, charte section headers.

## Licence

MIT
