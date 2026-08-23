# Principe de l'Ouverture dans ORIS

## Objectif

L'Ouverture est le processus du matin qui permet d'anticiper la préparation des sofas pour les arrivées du jour.

ORIS aide la réception à :

1. connaître l'état actuel des équipements sofa dans FOLS ;
2. déterminer le besoin réel de chaque chambre pour les arrivées ;
3. ajouter ou retirer les clés « Équipement Chambre » dans FOLS ;
4. produire la liste des sofas que le housekeeping devra ouvrir ou fermer.

Le Plan et la feuille d'Ouverture ont donc deux rôles différents :

- le **Plan ORIS** aide la réception à contrôler et mettre FOLS à jour ;
- la **feuille d'Ouverture** transmet au housekeeping le travail physique à effectuer dans les chambres.

## Sources utilisées

ORIS croise principalement :

- le **Room State**, qui décrit l'état actuel des chambres et permet de détecter les clés « Équipement Chambre » présentes dans FOLS ;
- la **liste des arrivées**, reliée au système d'Ouverture, qui fournit les réservations, les chambres attribuées et les besoins prévus ;
- les règles de capacité sofa des catégories de chambre ;
- les recouches confirmées déjà détectées par l'Assistant.

La même détection doit être réutilisée dans tous les écrans. ORIS ne doit pas créer un second mécanisme indépendant pour les recouches, les lits bébé ou les sofas.

## Déroulement du matin

### 1. Lire l'état actuel dans FOLS

ORIS détermine pour chaque chambre :

- son état FOLS : HS, en départ, arrivée, disponible ou présente ;
- si une clé « Équipement Chambre » est détectée ;
- le nombre de sofas indiqué dans le commentaire lorsque celui-ci permet de le préciser pour le housekeeping.

Dès qu'une fiche « Équipement Chambre » est détectée, la clé doit être visible sur le Plan. Dans FOLS, cette clé est binaire : elle est présente ou absente. La réception n'a aucune modification de clé à effectuer lorsque le besoin passe de 1 à 2 sofas ou de 2 à 1 sofa. Si le commentaire indique `1 SOFA`, `2 SOFAS` ou `FAMILLE`, ORIS peut toutefois en déduire la préparation physique actuelle pour le housekeeping. Une information ambiguë doit être proposée au contrôle, jamais inventée silencieusement.

### 2. Calculer le besoin des arrivées

Pour chaque chambre d'arrivée, ORIS calcule le nombre de sofas nécessaires selon la réservation et les règles de capacité.

Principes importants :

- une recouche confirmée n'est pas comptée dans le prévisionnel des sofas à préparer ;
- une recouche confirmée apparaît en jaune avec un `R` ;
- un séjour continu présent reste vert, sans `R` ;
- une chambre ne peut jamais nécessiter plus de sofas que sa capacité réelle, avec un maximum fonctionnel de deux sofas ;
- les réservations sans chambre attribuée ou les incohérences de capacité doivent être signalées au contrôle.

### 3. Comparer l'état actuel au besoin

ORIS compare, chambre par chambre :

`sofas actuellement déclarés dans FOLS → sofas nécessaires pour l'arrivée`

Le calcul housekeeping peut être :

- **ouvrir** : ouvrir un ou plusieurs sofas physiquement ;
- **fermer** : fermer un ou plusieurs sofas physiquement ;
- **laisser** : l'état FOLS correspond déjà au besoin ;
- **contrôler** : les données sont ambiguës, contradictoires ou incomplètes.

Ces écarts servent à guider la réception. Ils ne doivent pas polluer la lecture immédiate du Plan.

### 4. Mettre FOLS à jour

Le réceptionniste applique le matin les corrections proposées dans FOLS : ajout de la clé si au moins un sofa est nécessaire et qu'elle est absente, ou retrait si aucun sofa n'est nécessaire et qu'elle est présente. Il n'existe aucun ajustement FOLS entre 1 et 2 sofas.

ORIS aide à savoir rapidement quelles chambres doivent être mises à jour, mais FOLS reste la référence de l'état déclaré de la chambre.

Les compteurs « À ouvrir », « À fermer », « À laisser » et « À contrôler » du
Plan décrivent exclusivement la clé binaire FOLS. Un écart housekeeping de
`1 sofa → 2 sofas` avec une clé déjà présente est compté dans « À laisser » et
le popup indique « Clé correcte ». L'écart physique reste visible dans la ligne
« Préparation housekeeping », sans devenir une action réception.

### 5. Transmettre le travail au housekeeping

Après la mise à jour, ORIS fournit la liste opérationnelle des sofas à ouvrir ou fermer physiquement. Cette liste constitue l'information utile au housekeeping.

Le housekeeping n'a pas besoin de refaire l'analyse des réservations ni de comprendre les écarts FOLS : il reçoit une consigne claire par chambre.

## Affichage attendu sur le Plan

Une chambre du Plan doit permettre une lecture très rapide. Elle affiche uniquement :

- le numéro de chambre ;
- la couleur correspondant à l'état FOLS ;
- une grande clé noire lorsqu'un équipement sofa est détecté ;
- `R` uniquement lorsqu'une recouche est confirmée.

Une chambre en départ combine deux états dans le même bloc afin que la réception
n'ait pas besoin d'attendre les check-outs pour comprendre la journée :

- moitié gauche orange : client actuellement en départ ;
- moitié droite jaune : une arrivée est attribuée ensuite à cette chambre ;
- moitié droite grise : aucune arrivée n'est attribuée après le départ.

Cette séparation représente l'occupation `maintenant → après checkout`. La
chambre reste classée dans le filtre « En départ ». Elle n'est affichée que si
le Room State et l'Ouverture correspondent exactement à la même date ; sinon la
chambre reste entièrement orange afin de ne jamais présenter une arrivée d'un
autre jour comme une rotation fiable.

Les filtres de couleur agissent sur chaque état de la rotation. Si « En départ »
est décoché mais « Arrivée » reste coché, les rotations avec arrivée restent
visibles sous la forme d'une chambre entièrement jaune. Si seule « Disponible »
reste cochée, les départs sans arrivée apparaissent entièrement gris. Le filtre
permet ainsi de projeter le plan réel après checkout sans effectuer les départs
dans FOLS.

Code couleur :

- **bleu** : hors service ;
- **orange** : en départ ;
- **jaune** : arrivée ;
- **gris** : disponible ;
- **vert** : présent.

Une chambre qui nécessite l'ajout ou le retrait certain d'une clé dans FOLS
reçoit un contour violet lumineux. Le badge `+1` ou `+2` apparaît uniquement si
la clé est absente alors qu'un ou deux sofas sont nécessaires. Une clé déjà
présente est correcte dès qu'au moins un sofa est nécessaire, indépendamment du
nombre 1 ou 2 ; aucun halo ni badge n'est alors affiché. Les retraits ne sont pas
chiffrés sur le Plan afin d'éviter la pollution visuelle.

La vue « Action » constitue le raccourci de travail du matin. Elle projette le
plan après checkout et n'affiche que les chambres disponibles en gris ainsi que
les chambres entourées de violet qui nécessitent l'ajout ou le retrait d'une
clé FOLS. Les filtres couleur restent disponibles pour les autres lectures du
Plan ; cliquer sur l'un d'eux quitte la vue « Action ».

Les autres détails comme `-1`, `-2`, `1 → 2` ou `2 → 0` restent accessibles :

- dans la liste détaillée des actions ;
- dans le panneau léger ouvert au clic sur une chambre.

Le Plan répond ainsi à la question : **« Quelles clés dois-je mettre à jour dans FOLS ce matin ? »**

La feuille d'Ouverture répond ensuite à la question : **« Quels sofas le housekeeping doit-il ouvrir ou fermer aujourd'hui ? »**

## Résumé du flux

`Room State + arrivées + règles ORIS → contrôle visuel du Plan → mise à jour des clés dans FOLS par la réception → liste d'ouverture/fermeture pour le housekeeping`

## Prévision du parc de sofas jusqu'au dimanche

Le Plan réutilise directement le prévisionnel déjà calculé par l'Assistant. Il
ne possède pas une seconde logique de comptage et ne fait appel à aucune API :
la recommandation est locale, déterministe et reproductible à partir des
imports ORIS.

La priorité est hiérarchisée :

1. **Le besoin individuel J+1 est absolu.** Toute chambre individuelle déjà
   attribuée demain avec un besoin sofa est retenue avant les clés actuellement
   présentes et avant les attributions plus lointaines.
2. Le parc conseillé par catégorie couvre ensuite le besoin maximal observé
   entre demain et dimanche inclus.
3. Une marge réglable par catégorie peut ajouter des chambres au parc conseillé.
4. À volume constant, ORIS privilégie les chambres de groupe déjà attribuées,
   puis les autres chambres déjà attribuées dans la semaine, les clés déjà
   présentes et enfin les chambres disponibles.
5. Une chambre hors service n'est jamais proposée.

Avant toute recommandation, ORIS vérifie que le portefeuille est réellement
chargé et que sa date de référence correspond à celle du Plan. La date la plus
lointaine connue dans le portefeuille doit atteindre le dimanche calculé pour
autoriser une fermeture. Si cette couverture n'est pas démontrée, ORIS peut
encore proposer les ouvertures rendues nécessaires par les réservations connues,
mais bloque toutes les fermetures par sécurité.

Le résultat prévisionnel est toujours séparé en trois listes explicites :

- **ouvrir** : chambre sélectionnée sans clé FOLS actuelle ;
- **conserver** : chambre sélectionnée avec une clé déjà présente ;
- **fermer** : clé actuellement présente mais non retenue dans le parc conseillé,
  uniquement lorsque l'horizon est entièrement couvert.

Les groupes ne modifient jamais le volume cible des sofas à ouvrir ou fermer :
ce volume est calculé exclusivement depuis les besoins individuels. En revanche,
une chambre de groupe déjà attribuée avec un besoin sofa influence le choix des
chambres constituant ce parc. ORIS la privilégie donc à volume constant. Par
exemple, si des chambres TRI 228 à 245 sont attribuées à un groupe, elles sont
choisies en priorité parmi le nombre de TRI exigé par le prévisionnel individuel,
sans ajouter artificiellement 228 à 245 au nombre de clés nécessaires. Un groupe
non attribué n'a aucun effet sur le calcul ni sur la sélection.

Cette règle existe parce que le housekeeping reçoit une **feuille groupe
séparée**. Les besoins physiques des groupes sont déjà transmis par ce document.
Les additionner au prévisionnel individuel ORIS créerait un doublon et ferait
ouvrir trop de sofas. ORIS utilise donc les groupes comme information de
localisation, jamais comme quantité supplémentaire.

Les recouches confirmées par ID restent exclues. Lorsqu'une réservation est déjà
attribuée, la catégorie physique de la chambre prime sur la catégorie initialement
réservée, notamment après un surclassement.

Si le jour courant est un dimanche, l'horizon va jusqu'au dimanche suivant afin
de conserver une vraie semaine de décision. Les recommandations hebdomadaires
sont affichées séparément des halos violets d'intervention immédiate : elles
préparent le parc, mais ne modifient jamais les actions FOLS certaines du jour.

## Contrat de calcul pour les futures évolutions automatiques

Cette section constitue le contrat métier à préserver lors de toute correction,
refactorisation ou auto-upgrade du système.

### Sources de vérité

- Le **Room State** est la vérité absolue de l'état FOLS à l'instant de l'import :
  état de chambre et présence de la clé « Équipement Chambre ».
- Le **prévisionnel Assistant** est l'unique source du volume individuel par date
  et par catégorie. Aucun second compteur parallèle ne doit être créé dans le
  Plan.
- Les **réservations attribuées** servent à choisir des numéros de chambre, pas à
  recalculer le volume déjà fourni par le prévisionnel.
- Les **IDs de recouche**, l'état du lit bébé barré et les règles sofa doivent
  provenir des mécanismes partagés existants.
- La **feuille groupe HK** est l'unique support quantitatif des besoins groupe.

### Invariants non négociables

1. `volume cible = pic des besoins individuels par catégorie + marge manuelle`.
2. Les groupes ajoutent toujours `0` au volume cible.
3. Une chambre groupe sans numéro attribué ajoute `0` au volume et `0` à la
   sélection.
4. Une chambre groupe attribuée peut être choisie en priorité, mais seulement à
   l'intérieur du volume individuel déjà calculé.
5. Dix chambres groupe attribuées avec un besoin individuel cible de trois sofas
   produisent exactement trois chambres conseillées, jamais dix ni treize.
6. Une attribution individuelle J+1 est obligatoire et peut déplacer une autre
   chambre du parc conseillé.
7. Une attribution groupe J+1 est prioritaire dans la sélection, mais n'augmente
   jamais la cible et n'est donc pas une contrainte quantitative absolue.
8. Une recouche confirmée par le même ID ne compte ni dans le volume ni dans les
   recommandations d'ouverture.
9. Dès qu'un numéro est attribué, la catégorie physique de cette chambre prime
   sur la catégorie réservée.
10. Une chambre HS ne peut être ni candidate ni comptée comme clé active utile.
11. Une fermeture n'est autorisée que si le portefeuille est chargé, aligné sur
    la date du Plan et connu au moins jusqu'au dimanche de l'horizon.
12. En cas de couverture incomplète, ORIS peut proposer une ouverture certaine,
    mais doit bloquer toutes les fermetures.
13. Le système FOLS reste binaire : une clé présente couvre un besoin d'un ou de
    deux sofas. Le passage `1 sofa ↔ 2 sofas` n'est pas une action FOLS.
14. Les actions certaines du jour et les recommandations hebdomadaires ne doivent
    jamais partager le même compteur ni être présentées comme équivalentes.

### Algorithme de référence

Pour chaque catégorie de chambre :

1. lire les besoins **individuels** de J+1 jusqu'au dimanche ;
2. prendre leur maximum ;
3. ajouter la marge choisie par le réceptionniste ;
4. plafonner le résultat au nombre de chambres utilisables de la catégorie ;
5. verrouiller les attributions individuelles J+1 ;
6. classer les places restantes en favorisant les chambres groupe attribuées,
   les attributions futures, les clés déjà présentes puis les chambres libres ;
7. construire exactement le nombre de chambres correspondant à la cible ;
8. comparer cette sélection aux clés réellement détectées dans le Room State ;
9. produire trois ensembles disjoints : `ouvrir`, `conserver`, `fermer` ;
10. supprimer l'ensemble `fermer` si la couverture temporelle est insuffisante.

### Scénarios de non-régression obligatoires

- Portefeuille vide : aucune recommandation exploitable et aucune fermeture.
- Dates différentes : aucune recommandation automatique.
- Horizon incomplet : ouvertures certaines possibles, fermetures interdites.
- Groupe non attribué : aucun effet.
- Groupe attribué : influence la sélection, jamais la quantité.
- Plusieurs chambres groupe pour une cible individuelle plus petite : le nombre
  sélectionné reste strictement égal à la cible.
- Surclassement : classement selon la catégorie physique de la chambre.
- Recouche avec même ID : exclusion complète.
- Chambre HS avec une ancienne clé : exclusion du parc et du compteur utile.
- Dimanche : horizon prolongé jusqu'au dimanche suivant.

## Règles de fiabilité

- Une seule logique partagée pour les sofas, les recouches et les lits bébé.
- Aucun sofa supplémentaire inventé au-delà de la capacité de la chambre.
- Aucun doublon entre une recouche confirmée et une arrivée sofa.
- Aucune action automatique lorsque les dates des fichiers ne correspondent pas.
- Toute donnée ambiguë est placée à contrôler.
- Le Plan privilégie l'état réel et la lisibilité ; les calculs détaillés restent disponibles à la demande.
