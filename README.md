# ORIS — mémoire technique compacte pour LLM

Ce fichier est la carte de capacités d’ORIS pour les futures modifications automatisées. Il n’est pas un manuel utilisateur. Le code reste la source de vérité.

Principes :

- chercher une capacité existante avant d’en créer une nouvelle ;
- réutiliser les sources canoniques et APIs partagées ;
- éviter tout second stockage ou calcul concurrent ;
- distinguer données live, données persistées et vues dérivées ;
- vérifier le code consommateur avant de renommer un global, une clé ou un ID DOM.

## 1. Socle et ordre de chargement

ORIS est une application hôtelière côté navigateur, sans framework, bundler ni transpilation.

- `index.html` : DOM de toutes les vues, loaders CDN et ordre des scripts.
- `styles.css` : styles, thèmes, responsive et composants.
- `sofa-engine.js` : calculateur sofa/capacité commun, sans UI ni stockage dérivé.
- `script.js` : navigation, dashboard, Caisse, imports FOLS/ACDC, édition des règles et outils desk.
- `*.module.js` : domaines métier encapsulés dans des IIFE.
- `hotel.*.js` : modèle transversal et snapshot Hotel IA.
- `localStorage` : persistance métier principale.
- `server.mjs` et `api/` : serveur statique, auth, Luna et GitHub.
- Coordination : globals `window.*`, callbacks et rafraîchissements explicites ; pas de bus général, mais quelques événements ciblés comme `oris:sofa-rules-changed`.

Ordre contractuel dans `index.html` :

```text
sofa-engine.js → script.js
→ hotel.structure.js → hotel.model.js → hotel.entities.js
→ hotel.state.js → hotel.adapters.js → hotel.runtime.js
→ reservation-control.module.js → dd.module.js → overview.module.js
→ inventory.module.js → todo.module.js → groups.module.js
→ plan.module.js → hotel-ia.module.js → assistant.module.js → auth.module.js
```

Ne pas convertir isolément un script en module ES et ne pas déplacer un script sans auditer ses `window.*`.

## 2. Registre réel des capacités

| Surface / capacité | Propriétaire | Fonction réelle et données |
|---|---|---|
| Dashboard | `script.js`, `todo.module.js` | date active, KPI arrivées/départs/recouches/bébés/sofas, checklist, prévisionnel, alertes Évaluation/attribution, vacances, pression inventaire, surclassement sofa |
| Assistant | `assistant.module.js` | synthèse locale, checklist, VCC, prévisionnel, attributions, notifications, raccourcis et fenêtres bébé/communicante ; ce n’est pas une seconde LLM |
| Caisse | `script.js`, `view-revenue` | import d’un journal FOLS CSV, filtres paiement/utilisateur/heure, pointage, montants et comparaison TPE CB/AMEX ; état en mémoire seulement |
| Contrôle réservation | `reservation-control.module.js` | portefeuille individuel structuré, périodes Daily/Weekly/30 jours, contrôles locaux, requête et application Luna |
| Arrivées individuelles | `script.js` | synthèse par date : sofa, lit bébé, communicante, arrivée prioritaire, chambres multiples et preuves `Message` |
| Préférences | `overview.module.js` | proche/loin ascenseur et baignoire à partir du portefeuille/runtime ; peut utiliser les champs locaux de préférence |
| Groupes | `groups.module.js`, `script.js` | semaines, composition, volumes, vraies twin et alimentation de la pression inventaire |
| VCC | `script.js` | réservations Arrhes/PREPAY manquantes, dédoublonnées et triées |
| ACDC | `script.js` | import XLS/XLSX, alertes Évaluation et candidats de surclassement sofa ; n’alimente pas directement le Plan |
| DD | `dd.module.js` | sociétés isolées, imports CSV/XLS/XLSX, rapprochement de montants, solutions, verrous et historique |
| Inventaire | `inventory.module.js` | sections et articles éditables, déplacement par glisser-déposer, migration des anciens formats |
| Plan | `plan.module.js` | topologie embarquée des chambres/ascenseurs, imports état des chambres et arrivées, Night, besoins sofa, profil compact recalculable, alertes capacité par catégorie, filtres, verrouillage, déplacement, inspecteur, import/export JSON |
| Hotel IA | chaîne `hotel.*.js`, `hotel-ia.module.js` | snapshot transversal à la demande, entités, signaux et base de connaissance synthétique |
| Checklist / prévisionnel | `todo.module.js` | checklist matin/soir par date, APIs runtime Today/Week et graphique Plotly persistant |
| Règles | `script.js`, `sofa-engine.js` | édition/persistance des règles ; `ORIS_SOFA_ENGINE` est l’unique calculateur sofa/capacité pour Dashboard, Assistant, contrôle réservation, prévisionnel et Plan |
| Mémo / tarifs / emails | `script.js` | outils desk locaux persistants |
| Auth | `auth.module.js`, `api/auth.js`, `server.mjs` | verrou d’interface par mot de passe et déverrouillage de la session navigateur |
| Publication GitHub | `script.js`, `api/github.js` | écriture distante optionnelle après import ; aucune hydratation GitHub active du portefeuille |

## 3. Routage exact des imports

```text
CSV ou TXT
→ Arrival List FOLS
→ parser CSV tolérant
→ lignes live
→ portefeuille individuel + groupes + graphique
→ contrôles locaux + préparation Luna
```

```text
XLS ou XLSX
→ portefeuille ACDC
→ alertes Évaluation + candidats sofa
```

Le routeur général ne reconnaît pas un FOLS XLS/XLSX : tout tableur est traité comme ACDC.

Nouvel import FOLS :

1. purge les caches FOLS dérivés et anciens snapshots ;
2. reconstruit les lignes, dates, contrôles et preuves ;
3. conserve les lignes complètes seulement dans la session live ;
4. persiste des représentations structurées/compactes ;
5. publie seulement les métadonnées FOLS sur GitHub.

Le CSV brut FOLS n’est pas persisté.

## 4. Sources canoniques et rétention

| Source | Portée et format | À savoir |
|---|---|---|
| `window.__AAR_LAST_FOLS_ROWS` | lignes FOLS live de l’import courant | forme la plus riche ; ne survit pas telle quelle au rechargement |
| `aar_reservation_control_v3` / `window.__AAR_RESERVATION_CONTROL` | réservations individuelles structurées | source persistante principale pour contrôles, Luna, Assistant et runtime |
| `window.GROUPS_SOURCE` / `aar_groups_compact_v1` | réservations groupées compactes | séparées du portefeuille individuel |
| `aar_home_arrivals_source_v1` | JSON compact `{dates,yInd,yGrp}` | source du graphique, pas un CSV ni une copie FOLS |
| `aar_acdc_alerts_v1` | alertes Évaluation | issu d’ACDC |
| `aar_acdc_sofa_v1` | candidats sofa | issu d’ACDC |
| `aar_luna_preparation_pack_v1` | cibles de validation bébé/communicante | ce n’est pas une copie de tous les commentaires |
| `aar_plan_arrivals_profile_v1` | histogramme compact `{roomType,adults,children,babyDetected,count}` | sans nom ni commentaire ; permet au Plan de recalculer les besoins après une modification des règles |
| `window.HOTEL_RUNTIME_LAST` | dernier runtime construit | cache potentiellement ancien ; reconstruire pour obtenir du frais |

Rétention FOLS :

- la base de fenêtre est la première date d’arrivée du fichier importé ;
- les commentaires individuels sont conservés de cette date à `+30 jours` inclus ;
- `comments.message` est persisté jusqu’à 1000 caractères, ou 500 en fallback de quota ;
- hors fenêtre, les réservations restent structurées mais leurs commentaires sont vidés ;
- les groupes conservent un `Message` compact jusqu’à 600 caractères dans leur propre fenêtre, basée sur la date active du dashboard ;
- après rechargement, une forme FOLS partielle est reconstruite depuis les caches structurés : ne jamais supposer le retour des lignes raw complètes.

## 5. Contrat `Message`, contrôles et preuves

Pour Luna et les contrôles sémantiques issus du commentaire :

- `Message` est l’unique commentaire autorisé ;
- `message_html` peut exister transitoirement dans la ligne raw, mais n’est ni persisté ni envoyé ;
- `GUES_PREF`, `RoomNumPref` et `TO_DO_TO_SAY` ne prouvent jamais une demande dans Luna ;
- détection bébé/communicante, preuve du bouton `+` et cible Luna doivent provenir du même `Message` ;
- `reservationId` identifie une ligne de réservation ;
- `validationTargetId` identifie un contrôle précis, par exemple `reservation::baby_bed`.

Contrôles locaux actuellement calculés depuis `Message` :

- lit bébé ;
- communicante ;
- day use ;
- arrivée prioritaire ;
- baignoire ;
- sofa explicitement commenté.

Exceptions locales à connaître :

- `ORIS_SOFA_ENGINE.calculate()` est l’unique source du besoin sofa : la matrice éditable de l’onglet Règles l’emporte, sans seuil sofa forcé caché ;
- le compteur sofa compte les chambres dont le sofa doit être ouvert, pas le nombre de couchages sofa ;
- exception métier conservée : une demande de lit bébé avec 4 occupants ramène le besoin effectif à `1 sofa`, même si la matrice brute demande `2` ;
- alerte rouge pour toute réservation de 5 occupants ou plus ; alerte orange si l’occupation ou le besoin sofa dépasse la capacité de la catégorie de chambre, notamment `PRIVS` à 4 occupants ; ces alertes sont propagées au Dashboard, prévisionnel, Assistant, contrôle réservation et Plan ;
- le libellé utilisateur d’une alerte capacité est toujours `TYPE avec N pax`, où `N = NB_OCC_AD + NB_OCC_CH` ; le détail technique reste disponible dans `alertTechnicalReason` ;
- `RoomNumPref` et `Arriv_Hour` produisent des contrôles structurés locaux ;
- `elevatorExplicit` lit actuellement `Message + TO_DO_TO_SAY` ;
- la vue Préférences peut volontairement lire préférences/TODO en plus de `Message`.

Ces exceptions sont du contexte local et ne doivent pas être promues en preuve sémantique Luna.

## 6. Luna : préparation, envoi et retour

Deux objets distincts :

1. à l’import, `aar_luna_preparation_pack_v1` prépare uniquement les cibles bébé/communicante déjà détectées par ORIS ;
2. au clic Analyse, `buildBoostRecords()` reconstruit toutes les réservations individuelles ayant un `Message` dans la période sélectionnée et ajoute ces cibles.

Périodes :

- `daily` : date de base ;
- `weekly` : date de base à `+6 jours` ;
- `monthly` : date de base à `+30 jours` inclus.

Les groupes sont exclus. Le payload Luna contient :

- contexte technique de réservation ;
- `comments.message` uniquement ;
- faits/calculs locaux comme contexte non probant ;
- `validationTargets` obligatoires ;
- base de connaissance Hotel IA synthétique.

Retour JSON :

- `controlAudits[]` : exactement un verdict par cible bébé/communicante ;
- `operationNotes[]` : informations opérationnelles retenues par la grille ;
- états d’audit : `confirmed`, `conflict` ou `unclear`.

Il n’existe pas de plafond frontal sur le nombre d’items retournés. La sortie modèle est toutefois bornée à 16 000 tokens. La vue Contrôle réservation n’affiche que les 100 premiers dossiers utiles, sans limiter le traitement ni la sauvegarde.

## 7. Hotel Runtime et fonctions croisées

Chaîne :

| Fichier | Rôle |
|---|---|
| `hotel.structure.js` | topologie permanente, chambres et adjacences |
| `hotel.model.js` | concepts métier |
| `hotel.entities.js` | normalisation des entités |
| `hotel.state.js` | forme de l’état versionné |
| `hotel.adapters.js` | lecture des sources locales |
| `hotel.runtime.js` | fusion, snapshot, modules, signaux et knowledge base |
| `hotel-ia.module.js` | présentation |

Entrées actuelles du runtime :

- portefeuille FOLS / Reservation Control ;
- groupes ;
- ACDC alertes et sofa ;
- inventaire ;
- société DD sélectionnée ;
- checklist de la date active ;
- tarifs.

Ne sont pas intégrés actuellement : Plan/Night, Caisse, mémo, emails et vacances.

Le runtime est construit à la demande, pas réactif. Une cross-fonction doit appeler `HOTEL_RUNTIME.buildRuntime()` avant de lire des données fraîches. La knowledge base transmise à Luna contient identité, structure, snapshots, compteurs, sources et politique ; les réservations détaillées sont envoyées séparément dans `reservations`.

Le Plan possède actuellement son propre `DEFAULT_ROOMS` et ne consomme pas `HOTEL_STRUCTURE`. Modifier la structure Hotel IA ne modifie donc pas automatiquement le Plan, et inversement.

Pattern recommandé :

```text
source canonique
→ adapter du domaine
→ HOTEL_RUNTIME si croisement de domaines
→ API de lecture ciblée
→ vue/Assistant
```

Ne pas faire lire cinq clés `localStorage` directement par un nouveau widget.

## 8. APIs réutilisables

### APIs de domaine

| API | Méthodes utiles |
|---|---|
| `window.AAR` | `toast`, `safeJsonParse`, `byId`, `getDashboardActiveDateObj` |
| `window.ORIS_SOFA_ENGINE` | `calculate`, `normalizeRuleMap`, `getRuleSignature`, `normalizeRoomType`, `getRoomTypeModel`, `loadRuleMap` |
| `window.RESERVATION_CONTROL` | `processRows`, `refreshSofaRules`, `render`, `buildBoostRecords`, `buildLlmRequestModel`, `runBoost`, `applyLlmResult`, `applyLlmValidations`, `bind` |
| `window.ORIS_ASSISTANT` | `render`, `refresh`, `initFloatingPet`, `notify`, `notifyPersistent`, `resolveNotification` |
| `window.TODO` | `setToday`, `setWeek`, `refreshHomeChecklist`, `getHomeChecklistModel`, `renderHomeArrivalsChartFromStorage`, `refresh` |
| `window.DD` | `mount`, `unmount`, `init`, `refresh` |
| `window.PLAN` | `render`, `refreshSofaRules` |
| `window.OVERVIEW` | `refresh` |
| `window.HOTELIA` | `render`, `buildRuntime`, `buildKnowledgeBase` |
| `window.ORIS_AUTH` | `lock`, `unlock` |
| `window.HOTEL_RUNTIME` | `buildRuntime`, `buildHotelKnowledgeBase` |
| `window.HOTELAI_ADAPTERS` | adapters FOLS/groupes/préférences/inventaire/ACDC/checklist/tarifs/DD |

Socle exposé : `HOTEL_STRUCTURE`, `HOTEL_MODEL`, `HOTEL_ENTITIES`, `HOTEL_STATE`.

### Ponts de lecture déjà utilisés par l’Assistant

- `__AAR_GET_VCC_MISSING_ENTRIES()`
- `__AAR_GET_OCCUPANCY_FORECAST()`
- `__AAR_GET_ASSIGNMENT_WATCH_ALERTS()`
- `__AAR_OPEN_HOME_KPI_DETAIL(type, dateKey, anchor)`
- `__AAR_OPEN_ASSISTANT_CONTROL_DETAIL(type, dateKey, anchor)`
- `__AAR_INDIV_DAY_SUMMARY`
- `__AAR_ORIS_INDIV_DAY_CONTROL`

### Import et navigation

- `ORIS_OPEN_FOLS_IMPORT()`
- `ORIS_IMPORT_SOURCE_FILE(file)`
- `ORIS_NAVIGATE(target)`
- `AAR_LOAD_XLSX()`, `AAR_LOAD_PLOTLY()`, `AAR_LOAD_SCRIPT()`

Attention : `ORIS_NAVIGATE()` affiche la vue mais ne reproduit pas tous les rafraîchissements spécialisés attachés aux clics d’onglets. Appeler aussi l’API `refresh/render/init` du domaine concerné.

Ne pas utiliser `AAR.scheduleSaveState` comme persistance : cette fonction est actuellement un no-op.

## 9. Coordination après mutation

| Mutation | Actions attendues |
|---|---|
| nouvel FOLS | reset dérivés → parser → `RESERVATION_CONTROL.processRows` → groupes → graphique → vues dépendantes |
| nouvel ACDC | persister alertes/sofa → rafraîchir dashboard → reconstruire runtime à la demande |
| règles sofa | persister `aar_soiree_rules_v2` → `__AAR_REFRESH_SOFA_RULE_CONSUMERS()` → contrôle réservation, Dashboard, prévisionnel, Plan et Assistant ; la signature de matrice permet l’auto-réparation au rechargement ; conserver les résultats Luna et marquer les seules notes sofa « à revérifier » |
| checklist | persister la journée → rafraîchir dashboard et Assistant |
| groupes | mettre à jour `GROUPS_SOURCE` → `onGroupsSourceUpdated()` → pression inventaire |
| cross-fonction | écrire dans le propriétaire canonique → adapter/runtime → exposer une API de lecture |

Toujours invalider ou reconstruire les dérivés ; ne jamais les éditer comme source.

## 10. Persistance essentielle

| Clé | Usage |
|---|---|
| `aar_reservation_control_v3` | portefeuille individuel et contrôles |
| `aar_luna_preparation_pack_v1` | cibles Luna préparées |
| `aar_groups_compact_v1` | groupes compacts |
| `aar_home_arrivals_source_v1` | graphique/prévisionnel compact |
| `aar_acdc_alerts_v1`, `aar_acdc_sofa_v1` | ACDC |
| `aar_import_date_indiv_v1`, `aar_import_date_acdc_v1` | horodatage des imports |
| `aar_soiree_rules_v2` | règles métier |
| `aar_plan_arrivals_profile_v1` | profil compact permettant le recalcul sofa/alertes du Plan ; un ancien import sans ce profil neutralise les anciens besoins et exige un seul réimport |
| `aar_home_check_db_v3`, `aar_home_check_current_date_v1` | checklist Home |
| `aar_todo_today_v1`, `aar_todo_week_v1` | listes TODO actives |
| `aar_checklist_v2`, `aar_memo_v2` | checklist historique de l’outil et mémo |
| `aar_emails_v1`, `aar_tarifs_v1` | outils desk |
| `aar_inventory_v3_compact` | inventaire |
| `aar_dashboard_active_date_v1` | date dashboard écrite ; l’initialisation repart actuellement sur aujourd’hui |
| `aar_vac_zone_v1`, `aar_home_card_collapse_v1` | préférences dashboard |
| `dd_companies_v1`, `dd_company_selected_v1` | sociétés DD |
| `gdv_reconcile_v6_merge_import_stable_ids_k4_totalttc_*` | état DD isolé par société |
| `aar_plan_*` | état, imports, filtres et UI du Plan |
| `oris_api_base` | base API Luna personnalisée |
| `oris_session_unlocked_v1` | déverrouillage dans `sessionStorage`, jamais `localStorage` |

Compatibilité :

- inventaire migré depuis `aar_inventory_v1` et `aar_inventory_v2_sections` ;
- Reservation Control v1/v2 supprimé, pas migré ;
- `aar_arrivals_csv_v1`, anciens snapshots FOLS, lignes opérationnelles et groupes bruts sont purgés ;
- ne pas renommer une clé sans migration explicite.

## 11. Backend, déploiement et GitHub

### Local

```powershell
.\start-oris.bat
```

ou `npm start`, puis `http://127.0.0.1:8787/index.html`.

Routes locales :

- `GET /api/health`
- `GET|POST /api/auth`
- `POST /api/boost-reservations`

Le local prend le modèle demandé par le navigateur, sans timeout Luna explicite.

### Vercel

- mêmes routes dans `api/` ;
- `POST /api/github` en plus ;
- `OPENAI_MODEL` imposé côté serveur ;
- `OPENAI_TIMEOUT_MS`, défaut 60 secondes ;
- Chat Completions avec `response_format: json_object`.

Variables :

```text
OPENAI_API_KEY
OPENAI_MODEL
ORIS_ACCESS_PASSWORD
OPENAI_TIMEOUT_MS
GH_TOKEN
PORT             # local
HOST             # local
```

`ORIS_API_BASE` ou `localStorage.oris_api_base` peut rediriger l’appel Luna.

CDN paresseux nécessitant Internet :

- SheetJS `0.18.5` via `AAR_LOAD_XLSX` ;
- Plotly `2.30.0` via `AAR_LOAD_PLOTLY`.

### Publication GitHub actuelle

- dépôt codé en dur : `musheepcoin/musheep`, branche `main` ;
- `data/acdc.json` reçoit alertes et candidats sofa ;
- `data/portfolio.json` reçoit uniquement les métadonnées FOLS avec `portfolio_csv: ""` ;
- aucune restauration distante active dans le frontend ;
- `ghGetContentPath()` et le mode lecture de `/api/github` n’ont actuellement aucun appelant.

La persistance opérationnelle active reste locale.

## 12. Routage rapide d’une modification

- Sofa/capacité transversal : `sofa-engine.js` puis consommateurs dans `script.js`, `reservation-control.module.js`, `plan.module.js` et `assistant.module.js`.
- FOLS, dates, alias, parser, dashboard : `script.js`.
- Contrôles, rétention, prompt, schéma JSON, Luna : `reservation-control.module.js`.
- Proxy Luna : `server.mjs` + `api/boost-reservations.js`.
- Assistant : producteur `__AAR_GET_*` + `assistant.module.js`.
- Groupes : `script.js` + `groups.module.js`.
- Préférences : `overview.module.js` + Reservation Control/runtime.
- Plan/chambres/Night : `plan.module.js` ; `hotel.structure.js` reste une vérité séparée pour Hotel IA.
- Fonction multi-domaines : `hotel.adapters.js` puis `hotel.runtime.js`.
- UI/navigation : `index.html` + module propriétaire + `styles.css`.
- Persistance : source canonique + migration + tous les consommateurs.

## 13. Validation obligatoire

- Respecter UTF-8 et le scan d’`AGENTS.md`.
- Utiliser `apply_patch`, jamais `Set-Content` ou `Out-File`.
- Après modification JS : `node --check` sur chaque fichier touché.
- Après modification d’un JS/CSS chargé par `index.html` : ajouter ou renouveler son `?v=`.
- Tester import, vue concernée, rechargement, restauration et console.
- Vérifier les consommateurs `window.*`, IDs DOM et clés de stockage.
- Ne jamais exposer `.env`, tokens ou données clients.
- OpenAI doit rester appelé côté serveur.

## 14. Limites et dettes observées

- aucune suite de tests automatisés ;
- `script.js`, `styles.css` et `plan.module.js` sont volumineux ;
- couplage important par globals, ordre des scripts et IDs DOM ;
- `HOTEL_RUNTIME_LAST` peut être périmé : préférer un nouveau `buildRuntime()` ;
- `HOTELAI_ADAPTERS.parseHomeSource()` attend encore un ancien CSV alors que `aar_home_arrivals_source_v1` est désormais un JSON compact ;
- Plan et Hotel IA ont deux représentations distinctes de la structure des chambres ;
- plusieurs parseurs CSV spécialisés subsistent : ne pas les considérer interchangeables avec le parser FOLS principal ;
- l’auth est un verrou d’interface, pas une session serveur ; les APIs ne sont pas protégées par cette session ;
- le serveur local peut servir les fichiers du dossier, y compris `.env` si son URL est demandée : ne pas l’exposer au réseau avant correction ;
- `/api/github` n’a ni authentification applicative ni liste blanche de chemins ;
- `api/github.js` importe `node-fetch`, absent de `package.json`, alors que Node 18 fournit déjà `fetch` ;
- `data/acdc.json` contient des données nominatives et doit être traité comme sensible ;
- Caisse, Plan/Night, mémo, emails et vacances ne font pas encore partie du runtime transversal.

Critère final : une évolution doit réutiliser le propriétaire canonique, rester compatible avec les données existantes, rafraîchir tous les consommateurs et ne créer ni vérité parallèle ni doublon fonctionnel.
