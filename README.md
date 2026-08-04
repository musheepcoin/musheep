# ORIS — guide technique pour maintenance par Codex

Ce fichier est une carte opérationnelle du dépôt. Il est destiné aux futures interventions automatisées, pas à la présentation du produit. Le code reste la source de vérité.

## 1. Résumé exécutable

ORIS est un tableau de bord hôtelier français, côté navigateur, sans framework, bundler, transpilation ni suite de tests. L’interface repose sur :

- `index.html` pour tout le DOM statique ;
- `styles.css` pour toute la présentation ;
- `script.js` pour l’orchestration principale, les imports FOLS/ACDC, le dashboard, les règles et la synchronisation GitHub ;
- des modules JavaScript classiques encapsulés dans des IIFE et reliés par des propriétés de `window` ;
- `localStorage` comme persistance métier principale ;
- deux fichiers GitHub distants pour la synchronisation du portefeuille et d’ACDC ;
- des fonctions Vercel dans `api/` ;
- `server.mjs` comme serveur local autonome.

Ne pas convertir un fichier isolé en module ES : les scripts sont chargés comme scripts classiques et dépendent de leur ordre d’exécution.

## 2. Démarrage et validation

### Local

Sous Windows :

```powershell
.\start-oris.bat
```

Le lanceur utilise le runtime Node de Codex s’il existe, sinon `node`, démarre `server.mjs`, puis ouvre :

```text
http://127.0.0.1:8787/index.html
```

Alternative :

```powershell
npm start
```

Le serveur local fournit :

- les fichiers statiques ;
- `GET /api/health` ;
- `GET|POST /api/auth` ;
- `POST /api/boost-reservations`.

Attention : le serveur local n’implémente pas `/api/github`. Cette route existe uniquement dans `api/github.js` pour Vercel.

### Variables d’environnement

Copier `.env.example` vers `.env` pour le local :

```text
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
ORIS_ACCESS_PASSWORD=...
```

Variables supplémentaires utilisées sur Vercel :

- `GH_TOKEN` pour écrire dans le dépôt GitHub ;
- `OPENAI_TIMEOUT_MS`, facultative, valeur par défaut `60000`.

`.env` ne doit jamais être versionné, affiché ou inclus dans un diagnostic.

### Contrôles minimum après modification

Après toute modification JavaScript :

```powershell
node --check script.js
```

Valider également chaque module touché et les fonctions de `api/`.

Après modification de HTML, CSS, JavaScript, Markdown ou d’un module, exécuter le scan d’encodage imposé par `AGENTS.md`. Les fichiers contiennent du français, des symboles SVG et des emoji : ne jamais les réécrire avec `Set-Content`, `Out-File` ou un pipeline PowerShell.

Pour une modification d’interface, vérifier au minimum :

1. déverrouillage ou mode sans mot de passe ;
2. navigation vers la vue concernée ;
3. import utilisé par cette vue ;
4. restauration après rechargement ;
5. absence d’erreur dans la console.

## 3. Ordre de chargement — invariant critique

Ordre actuel à la fin de `index.html` :

1. `script.js`
2. `hotel.structure.js`
3. `hotel.model.js`
4. `hotel.entities.js`
5. `hotel.state.js`
6. `hotel.adapters.js`
7. `hotel.runtime.js`
8. `reservation-control.module.js`
9. `dd.module.js`
10. `overview.module.js`
11. `inventory.module.js`
12. `todo.module.js`
13. `groups.module.js`
14. `plan.module.js`
15. `hotel-ia.module.js`
16. `assistant.module.js`
17. `auth.module.js`

Raisons importantes :

- `script.js` expose les règles, imports, données temporaires et fonctions utilisées par plusieurs modules ;
- la chaîne Hotel IA doit rester `structure → model → entities → state → adapters → runtime` ;
- `reservation-control.module.js` consomme les règles de `script.js` et le runtime hôtel ;
- `assistant.module.js` consomme les APIs déjà exposées par TODO, réservation et dashboard ;
- `auth.module.js` se lance en dernier et contrôle l’accès à l’application assemblée.

Avant de déplacer un script, rechercher toutes ses lectures et écritures `window.*`.

## 4. Carte des fichiers

| Fichier | Responsabilité réelle | Contrats principaux |
|---|---|---|
| `index.html` | Structure complète des vues, navigation, écrans d’import, auth et chargement CDN | IDs DOM utilisés directement dans les scripts |
| `styles.css` | Tous les styles, responsive, thèmes, composants et auth | Sélecteurs fortement liés aux IDs/classes du HTML |
| `script.js` | Noyau fonctionnel, navigation, dashboard, règles, imports, FOLS, ACDC, groupes compacts, GitHub | `window.AAR`, `ORIS_NAVIGATE`, fonctions `__AAR_*`, `GH_*` |
| `reservation-control.module.js` | Normalisation des réservations FOLS, contrôles, préparation et application Luna | `window.RESERVATION_CONTROL`, runtime hôtel, assistant |
| `assistant.module.js` | Vue Assistant, widget flottant, notifications et raccourcis métier | `window.ORIS_ASSISTANT`, fonctions `__AAR_GET_*` |
| `todo.module.js` | Checklist quotidienne/hebdomadaire et graphique d’arrivées Plotly | `window.TODO`, règles et source compacte du dashboard |
| `groups.module.js` | Agrégation hebdomadaire des groupes | `window.GROUPS_SOURCE`, `__AAR_GROUPS_WEEKS_RESULT` |
| `overview.module.js` | Vue ascenseur/baignoire à partir du portefeuille | `window.OVERVIEW`, runtime Hotel IA ou source locale |
| `inventory.module.js` | Inventaire desk éditable et migration des anciennes versions | `aar_inventory_v3_compact` |
| `dd.module.js` | Sociétés, imports XLSX/CSV, rapprochement DD et verrous | `window.DD`, stockage isolé par société |
| `plan.module.js` | Plan des chambres, disposition, ascenseurs, sofa, Night et imports | `window.PLAN`, nombreuses clés `aar_plan_*` |
| `hotel.structure.js` | Topologie et adjacence statiques des chambres | `window.HOTEL_STRUCTURE` |
| `hotel.model.js` | Métadonnées conceptuelles de l’hôtel | `window.HOTEL_MODEL` |
| `hotel.entities.js` | Normalisation des entités hôtel | `window.HOTEL_ENTITIES` |
| `hotel.state.js` | Constructeur de l’état hôtel vide/versionné | `window.HOTEL_STATE` |
| `hotel.adapters.js` | Adaptation de `localStorage` et des données métier vers le runtime | `window.HOTELAI_ADAPTERS` |
| `hotel.runtime.js` | Snapshot, signaux, synthèse des modules et base de connaissance | `window.HOTEL_RUNTIME`, `HOTEL_RUNTIME_LAST` |
| `hotel-ia.module.js` | Rendu de la vue Hotel IA | `window.HOTELIA` |
| `auth.module.js` | Verrouillage de session et validation du mot de passe | `window.ORIS_AUTH`, `sessionStorage` |
| `server.mjs` | Serveur local statique + auth + OpenAI | charge `.env` manuellement |
| `api/auth.js` | Auth Vercel | `ORIS_ACCESS_PASSWORD` |
| `api/health.js` | Santé et configuration Luna | ne révèle jamais la clé |
| `api/boost-reservations.js` | Proxy OpenAI pour Luna | Chat Completions avec réponse JSON |
| `api/github.js` | Écriture de JSON sur GitHub | `GH_TOKEN`, corps `{path, content, message}` |
| `data/portfolio.json` | Copie distante compacte du portefeuille | synchronisée par `script.js` |
| `data/acdc.json` | Copie distante des alertes/candidats ACDC | synchronisée par `script.js` |
| `vercel.json` | En-têtes UTF-8 pour HTML, JS et CSS | déploiement Vercel |
| `CNAME` | Domaine personnalisé | conserver si le domaine reste actif |

## 5. Flux métier principaux

### Import FOLS / portefeuille

```text
fichier utilisateur
→ routeHomeSourceFile()
→ parsing CSV/XLSX
→ normalisation réservation
→ RESERVATION_CONTROL
→ localStorage aar_reservation_control_v3
→ groupes compacts + source graphique
→ HOTEL_RUNTIME.buildRuntime()
→ dashboard / overview / assistant / Hotel IA
→ data/portfolio.json via /api/github si demandé
```

Points de vigilance :

- préserver les alias de colonnes FOLS dans les fonctions `pick(...)` ;
- les dates importées déterminent la période visible et la base Luna ;
- les noms opérationnels ont plusieurs normalisations selon VCC, ACDC et affichage ;
- les anciennes copies FOLS sont volontairement supprimées au démarrage pour éviter de saturer `localStorage`.

### Import ACDC

```text
fichier ACDC
→ chargement XLSX
→ extraction des alertes + candidats sofa
→ aar_acdc_alerts_v1 / aar_acdc_sofa_v1
→ dashboard + plan + runtime hôtel
→ data/acdc.json via /api/github
```

### Analyse Luna

```text
réservations contrôlables
→ paquet compact dans reservation-control.module.js
→ POST /api/boost-reservations
→ OpenAI Chat Completions, réponse JSON
→ validation/normalisation
→ application aux contrôles utiles
→ sauvegarde aar_reservation_control_v3
→ reconstruction HOTEL_RUNTIME
→ notification Assistant
```

L’URL d’API peut être remplacée par `window.ORIS_API_BASE` ou la clé `oris_api_base`.

Ne jamais appeler OpenAI directement depuis le navigateur : la clé doit rester côté serveur.

Le paquet Luna utilise uniquement la colonne FOLS `Message`. `message_html` est exclu comme doublon plus lourd et plus bruité. `GUES_PREF`, `RoomNumPref`, `TO_DO_TO_SAY` et les préférences de profil restent disponibles pour les vues locales, mais sont exclus de l’analyse Luna et ne doivent jamais être interprétés comme des demandes client.

### Synchronisation GitHub

Configuration cliente codée au début de `script.js` :

- dépôt `musheepcoin/musheep` ;
- branche `main` ;
- chemins autorisés `data/portfolio.json` et `data/acdc.json`.

Lecture : contenu brut GitHub.

Écriture : `POST /api/github`, puis GitHub Contents API. Le token reste uniquement dans `GH_TOKEN` côté Vercel.

Si la synchro distante échoue, la persistance locale doit continuer à fonctionner.

## 6. Persistance navigateur

### Session

| Clé | Usage |
|---|---|
| `oris_session_unlocked_v1` | session déverrouillée jusqu’à fermeture de l’onglet/session |

### Données opérationnelles partagées

| Clé | Usage |
|---|---|
| `aar_reservation_control_v3` | portefeuille normalisé et contrôles de réservation |
| `aar_groups_compact_v1` | groupes compacts dérivés |
| `aar_home_arrivals_source_v1` | source compacte du graphique/dashboard |
| `aar_acdc_alerts_v1` | alertes ACDC |
| `aar_acdc_sofa_v1` | candidats sofa ACDC |
| `aar_import_date_indiv_v1` | date/heure du dernier import FOLS |
| `aar_import_date_acdc_v1` | date/heure du dernier import ACDC |
| `aar_arrivals_csv_v1` | CSV brut de compatibilité, supprimé lorsque possible |
| `aar_luna_preparation_pack_v1` | préparation compacte Luna |

### Configuration et interface

| Clé | Usage |
|---|---|
| `aar_soiree_rules_v2` | règles métier, mots-clés et checklist |
| `aar_home_check_db_v3` | checklist quotidienne par date |
| `aar_home_check_current_date_v1` | date de checklist active |
| `aar_dashboard_active_date_v1` | date courante du dashboard |
| `aar_checklist_v2`, `aar_memo_v2` | checklist historique et mémo |
| `aar_emails_v1`, `aar_tarifs_v1` | listes éditables |
| `aar_inventory_v3_compact` | inventaire actuel |
| `aar_vac_zone_v1` | zone vacances |
| `aar_home_card_collapse_v1` | état replié des cartes |
| `oris_api_base` | base API personnalisée |

### Espaces spécialisés

- DD : `dd_companies_v1`, `dd_company_selected_v1` et une clé d’état suffixée par société.
- Plan : toutes les clés commencent par `aar_plan_`; elles couvrent disposition, version, ascenseurs, tailles, verrouillage, filtres, Night, sofa, métadonnées et panneaux.
- Inventaire : migration automatique depuis `aar_inventory_v1` et `aar_inventory_v2_sections`.
- TODO historique : `aar_todo_today_v1` et `aar_todo_week_v1`.

Ne pas renommer une clé sans migration explicite. Toujours prévoir les données déjà présentes dans les navigateurs utilisateurs.

## 7. Contrats globaux à préserver

APIs publiques importantes :

- `window.ORIS_NAVIGATE(target)` : navigation applicative ;
- `window.ORIS_ASSISTANT` : rendu et notifications ;
- `window.RESERVATION_CONTROL` : import, rendu et analyse des réservations ;
- `window.HOTEL_RUNTIME.buildRuntime()` : reconstruction du runtime après mutation métier ;
- `window.HOTEL_RUNTIME.buildHotelKnowledgeBase()` : contexte structuré ;
- `window.TODO`, `window.DD`, `window.PLAN`, `window.OVERVIEW`, `window.HOTELIA` ;
- `window.ORIS_OPEN_FOLS_IMPORT()` et `window.ORIS_IMPORT_SOURCE_FILE(file)`.

Les propriétés `window.__AAR_*` sont des ponts internes, mais plusieurs modules les consomment. Avant d’en supprimer une, rechercher le dépôt entier.

Après une mutation FOLS, ACDC, règles ou contrôles :

1. enregistrer la représentation canonique ;
2. rafraîchir les vues dérivées nécessaires ;
3. reconstruire `HOTEL_RUNTIME` ;
4. rafraîchir l’assistant si son contenu dépend de la mutation.

## 8. Dépendances externes

Chargées à la demande depuis CDN :

- SheetJS `xlsx` 0.18.5 pour XLS/XLSX ;
- Plotly 2.30.0 pour le graphique des arrivées.

`index.html` expose `AAR_LOAD_XLSX` et `AAR_LOAD_PLOTLY`. `dd.module.js` possède aussi un chargement SheetJS de secours.

Sans réseau :

- les fonctions locales et CSV continuent de fonctionner ;
- XLS/XLSX et Plotly peuvent être indisponibles ;
- GitHub et Luna sont indisponibles.

## 9. Stratégie de modification

### Changement de navigation ou d’une vue

Inspecter ensemble :

- le bloc DOM correspondant dans `index.html` ;
- `showTab`, `ORIS_NAVIGATE` et les initialisations dans `script.js` ;
- le module de la vue ;
- les sélecteurs concernés dans `styles.css`.

### Changement d’import ou de règle métier

Inspecter au minimum :

- parsing et aliases dans `script.js` ;
- `reservation-control.module.js` ;
- `hotel.adapters.js` ;
- `hotel.runtime.js` ;
- consommateurs Assistant, Overview, TODO, Groups ou Plan ;
- format compact sauvegardé et compatibilité avec les anciennes données.

### Changement Hotel IA

Respecter la séparation :

- structure statique : `hotel.structure.js` ;
- modèle métier : `hotel.model.js` ;
- normalisation : `hotel.entities.js` ;
- forme de l’état : `hotel.state.js` ;
- lecture des sources : `hotel.adapters.js` ;
- calculs/signaux : `hotel.runtime.js` ;
- présentation : `hotel-ia.module.js`.

### Changement API

Maintenir autant que possible la parité entre :

- `server.mjs` pour le local ;
- `api/auth.js`, `api/health.js`, `api/boost-reservations.js` pour Vercel.

Exception connue : `/api/github` est uniquement disponible sur Vercel.

## 10. Risques et dette technique connue

- `script.js`, `styles.css` et `plan.module.js` sont volumineux : limiter les modifications à des zones précises.
- Il n’existe pas de tests automatisés ni de build de validation.
- Les contrats intermodules reposent sur `window`, l’ordre des scripts et les IDs DOM.
- Des chemins GitHub et le dépôt cible sont codés en dur dans `script.js` et `api/github.js`.
- La branche configurée existe dans `window.GH_BRANCH`, mais certaines lectures clientes utilisent encore littéralement `main` : vérifier les deux avant un changement de branche.
- Le modèle OpenAI par défaut est `gpt-5.6-luna` ; sa disponibilité dépend de l’environnement configuré.
- L’authentification est un verrou d’accès applicatif par mot de passe et session navigateur, pas un système de comptes utilisateurs.
- Les migrations `localStorage` et nettoyages d’anciennes clés sont intentionnels ; ne pas les retirer sans vérifier la compatibilité terrain.
- Les données de réservation peuvent contenir des informations personnelles : ne pas ajouter de jeux de test réels ou de dumps temporaires au dépôt.

## 11. Critères de fin pour Codex

Une intervention n’est terminée que si :

- les fichiers modifiés respectent UTF-8 ;
- la syntaxe JavaScript est valide ;
- aucune référence de fichier ou d’ID DOM n’est devenue orpheline ;
- les anciennes données `localStorage` restent lisibles ou sont migrées ;
- les flux local et Vercel restent cohérents lorsqu’ils sont concernés ;
- les secrets et données personnelles ne sont pas exposés ;
- le README est ajusté si l’architecture, les contrats, les routes, les variables ou la persistance changent.
