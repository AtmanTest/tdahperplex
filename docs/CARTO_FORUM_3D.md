# Carto Forum 3D — Documentation

> Globe interactif 3D des actualités TDAH — Visualisation géolocalisée des sources RSS et articles sur le Trouble du Déficit de l'Attention avec ou sans Hyperactivité.

---

## 1. Architecture

L'application est structurée sur **2 niveaux** :

### Niveau 1 — Client (Globe 3D)

Navigateur web affichant un globe terrestre 3D grâce à [Globe.GL](https://globe.gl/) et [Three.js](https://threejs.org/).

| Composant | Technologie | Rôle |
|---|---|---|
| Globe 3D | Globe.GL (Three.js) | Rendu du globe interactif |
| Points lumineux | Globe.GL — `pointsData` | Géolocalisation des sources RSS |
| Marquers de articles | Globe.GL — `ringsData` / custom layer | Articles récents affichés comme anneaux animés |
| Interface utilisateur | HTML/CSS/JS | Filtres, légende, infobulles |

### Niveau 2 — Collecte de données

Système de collecte et d'agrégation des flux RSS :

| Composant | Rôle |
|---|---|
| `data/rss-sources.json` | Liste blanche des sources RSS autorisées (12 sources) |
| `data/rss-demo.json` | Jeu de données de démonstration (18 articles factices) |
| Script de collecte (à implémenter) | Parse les flux RSS, normalise les articles, génère le fichier JSON |
| Service de cache (optionnel) | Met en cache les flux pour limiter les appels réseaux |

---

## 2. Sources RSS configurées

### Amérique du Nord

| ID | Nom | Ville | Langue | Catégorie |
|---|---|---|---|---|
| `additude` | ADDitude Magazine | New York, US | EN | clinical |
| `chadd` | CHADD | Landover, US | EN | association |
| `nimh-adhd` | NIMH ADHD | Bethesda, US | EN | research |
| `caddra` | CADDRA | Toronto, CA | EN/FR | clinical |
| `apsard` | APSARD | Washington DC, US | EN | research |
| `adhdawareness` | ADHDAwareness | New York, US | EN | association |
| `psycom` | Psycom.net | New York, US | EN | clinical |

### Google News Agrégateur

| ID | Nom | Portée | Langue | Catégorie |
|---|---|---|---|---|
| `google-news-adhd` | Google News ADHD | International | EN | news |
| `google-news-adhd-research` | Google News ADHD Research | International | EN | research |
| `google-news-tdah` | Google News TDAH | International | FR | news |

### Europe

| ID | Nom | Ville | Langue | Catégorie |
|---|---|---|---|---|
| `tdah-france` | TDAH France / HyperSupers | Paris, FR | FR | association |
| `nhs-adhd-uk` | NHS ADHD UK | London, UK | EN | clinical |

### Catégories

- **clinical** : Informations cliniques, diagnostics, traitements
- **research** : Recherche scientifique, études, essais cliniques
- **association** : Actualités d'associations de patients et professionnels
- **news** : Actualités générales, articles de presse

---

## 3. Fichiers de données

### `data/rss-sources.json`

Fichier JSON contenant la **liste blanche** des sources RSS. Chaque source inclut :

| Champ | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique (slug) |
| `name` | string | Nom lisible de la source |
| `url` | string | URL du flux RSS |
| `lang` | string | Code langue (EN, FR) |
| `country` | string | Code pays (US, FR, UK, CA) |
| `lat` | float | Latitude du siège / zone de couverture |
| `lng` | float | Longitude du siège / zone de couverture |
| `category` | string | Catégorie parmi clinical, research, association, news |
| `active` | boolean | Source active ou désactivée |

### `data/rss-demo.json`

Fichier de démonstration contenant **18 articles factices** (clairement marqués `[Démo]`). Chaque article inclut :

| Champ | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique (préfixe `demo-`) |
| `title` | string | Titre de l'article (avec balise `[Démo]`) |
| `source_id` | string | Référence vers une source de `rss-sources.json` |
| `source_name` | string | Nom de la source |
| `source_country` | string | Pays de la source |
| `source_lat` | float | Latitude de la source |
| `source_lng` | float | Longitude de la source |
| `lang` | string | Langue de l'article (EN, FR) |
| `category` | string | Catégorie de l'article |
| `published` | string | Date de publication (ISO 8601) |
| `url` | string | URL de l'article (lien fictif `example.com/demo/`) |
| `summary` | string | Résumé de l'article |
| `tags` | array[string] | Mots-clés associés |

---

## 4. Comment tester localement

### Prérequis

- Navigateur web moderne (Chrome, Firefox, Safari, Edge)
- Un serveur HTTP local (optionnel mais recommandé pour éviter les restrictions CORS)

### Procédure

```bash
# 1. Se placer dans le répertoire du projet
cd /tmp/tdahperplex

# 2. Démarrer un serveur HTTP simple (Python)
python3 -m http.server 8080

# 3. Ouvrir dans le navigateur
open http://localhost:8080/index.html
```

### Fichiers de test

```bash
# Vérifier la structure des fichiers JSON
python3 -c "
import json
with open('data/rss-sources.json') as f:
    sources = json.load(f)
    print(f'✓ {len(sources)} sources RSS chargées')

with open('data/rss-demo.json') as f:
    demo = json.load(f)
    print(f'✓ {len(demo[\"articles\"])} articles de démo chargés')
"
```

### Fonctionnalités à tester

1. Chargement du globe 3D (attendre le rendu complet)
2. Affichage des points lumineux pour chaque source RSS
3. Affichage des anneaux animés pour les articles récents
4. Filtrage par catégorie (clinical, research, association, news)
5. Filtrage par langue (EN, FR)
6. Infobulle au survol d'un point/anneau
7. Rotation automatique du globe
8. Zoom et rotation manuels (souris)

---

## 5. Déploiement

### Option A — GitHub Pages (recommandé)

Aucune configuration particulière nécessaire. Le projet est déjà compatible GitHub Pages (`.nojekyll` présent).

```bash
# Pousser les modifications sur la branche principale
git add data/ docs/
git commit -m "feat: add Carto Forum 3D data files and documentation"
git push origin main
```

Le site est accessible à l'URL : `https://<utilisateur>.github.io/<repository>/`

### Option B — Serveur dédié

```bash
# Copier les fichiers sur le serveur
scp -r /tmp/tdahperplex/* user@server:/var/www/carto-forum-3d/

# Configurer Nginx pour servir le dossier statique
# (exemple de configuration)
server {
    listen 80;
    server_name carto-forum.example.com;
    root /var/www/carto-forum-3d;
    index index.html;
    
    location /data/ {
        add_header Access-Control-Allow-Origin "*";
    }
}
```

### Option C — Vercel / Netlify

Déploiement en un clic en connectant le dépôt GitHub :

1. Créer un compte sur Vercel ou Netlify
2. Connecter le dépôt GitHub
3. Déployer (pas de build nécessaire — site statique)

---

## 6. Crédits et licences

| Bibliothèque | Version | Licence | Utilisation |
|---|---|---|---|
| [Globe.GL](https://globe.gl/) | 2.x | **MIT** | Rendu du globe terrestre 3D |
| [Three.js](https://threejs.org/) | r150+ | **MIT** | Moteur 3D sous-jacent |
| Données de démonstration | — | CC0 | Articles factices — domaine public |

### Licences

- **Globe.GL** (MIT) — Copyright © 2020-2026 Vasco Asturiano. Voir [LICENSE](https://github.com/vasturiano/globe.gl/blob/master/LICENSE).
- **Three.js** (MIT) — Copyright © 2010-2026 Three.js Authors. Voir [LICENSE](https://github.com/mrdoob/three.js/blob/dev/LICENSE).

Les données de ce dépôt (`data/rss-sources.json`, `data/rss-demo.json`) sont publiées sous licence **CC0 1.0 Universal** — librement utilisables, modifiables et redistribuables sans attribution.

---

## 7. Limites connues

### Techniques

1. **CORS** : Certains flux RSS peuvent bloquer les requêtes cross-origin depuis le navigateur. Une solution proxy (ex: `rss2json.com`, Cloudflare Workers) peut être nécessaire en production.

2. **Format des flux** : Les flux RSS/Atom n'ont pas de format standardisé. Les scripts de parsing doivent gérer plusieurs formats (RSS 2.0, Atom, JSON Feed).

3. **Latence** : Les flux RSS peuvent mettre plusieurs secondes à répondre. L'interface doit afficher un état de chargement.

4. **Globe.GL** : La bibliothèque peut être lourde sur les appareils mobiles. Testée principalement sur desktop.

5. **Coordonnées** : Les coordonnées lat/lng des sources RSS agrégées (Google News) sont approximatives (siège social de Google).

### Données

6. **Articles factices** : Le fichier `rss-demo.json` contient uniquement des articles de démonstration. En production, ces données doivent être remplacées par de vrais flux RSS parsés.

7. **Dédoublonnage** : Google News peut renvoyer des articles déjà présents dans les sources directes. Un mécanisme de dédoublonnage par URL/titre est nécessaire.

8. **Volume** : Le nombre d'articles affichés simultanément doit être limité (max 50-100) pour éviter la surcharge visuelle et les problèmes de performance.

### Vie privée

9. **Géolocalisation** : Les coordonnées représentent le siège des organisations, pas les utilisateurs. Aucune donnée personnelle n'est collectée.

10. **Tracking** : Aucun cookie ou tracker tiers. Les appels aux flux RSS sont directs (pas d'intermédiaire analytique).

### Internationalisation

11. **Langues** : Seulement EN et FR pour l'instant. L'ajout d'autres langues (DE, ES, IT, NL) nécessite des sources RSS supplémentaires.

12. **Traduction des catégories** : Les catégories ne sont pas traduites dans l'interface actuelle.

---

## 8. Évolution future

- [ ] Script d'agrégation RSS automatique (Node.js ou Python)
- [ ] Cache serveur des flux RSS
- [ ] Filtres par date et mots-clés
- [ ] Mode pleine page / immersif
- [ ] Export des données filtrées
- [ ] Widget embeddable
- [ ] Notifications de nouveaux articles
- [ ] Support de langues additionnelles (DE, ES, IT)
- [ ] Points de chaleur (heatmap) par densité d'articles
- [ ] Timeline animée des publications

---

> **Documentation générée le** 2026-07-11  
> **Dernière mise à jour des données RSS :** 12 sources actives  
> **Articles de démonstration :** 18 articles factices  
> **Projet :** Carto Forum 3D — TDAH Perplex
