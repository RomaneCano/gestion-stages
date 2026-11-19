# Checklist de conformité à l'énoncé

## Partie 1 — Développement de l'API REST
- [x] API REST en Python / FastAPI
- [x] Un stage : id, nom de l'étudiant, entreprise d'accueil, intitulé, date de début, date de fin
- [x] Méthodes HTTP : GET, POST, PUT, DELETE
- [x] Base de données SQLite
- [x] Validation des données (champs non vides, date de fin ≥ date de début)

## Partie 2 — Tester l'API (Swagger / Postman)
- [x] Création d'un stage — `docs/screenshots/21`
- [x] Consultation de la liste — `23` (et d'un stage — `24`)
- [x] Modification — `25`
- [x] Suppression — `27`
- [x] Comportement si le stage n'existe pas (404) — `26`, `28`
- [x] 14 tests automatisés (`pytest`)

## Partie 3 — Conteneurisation avec Docker
- [x] Dockerfile à la racine
- [x] Construire l'image — `docs/screenshots/30`
- [x] Lancer un conteneur — `31`
- [x] Vérifier que l'API fonctionne dans le conteneur — `31`, `33`
- [x] Accéder à la documentation Swagger — `34`

## Partie 4 — Déploiement sur Render  *(à réaliser avec votre compte)*
- [ ] Code déposé sur GitHub
- [ ] Compte Render créé
- [ ] Dépôt GitHub connecté à Render
- [ ] Web Service : environnement Docker, plan gratuit
- [ ] Déploiement lancé et terminé
- [ ] URL publique récupérée et reportée dans le README
- [ ] Endpoints testés depuis un navigateur / Postman (captures à ajouter)

## Livrables
- [x] Code source (dépôt GitHub)
- [x] Dockerfile
- [ ] URL publique de l'API déployée
- [x] Courte documentation des endpoints (`README.md`)
- [x] Captures d'écran du fonctionnement de l'API (`docs/screenshots`) — celles du déploiement Render restent à ajouter

## Remarque de l'énoncé
- [x] Aucune donnée personnelle réelle (noms fictifs, rappel dans l'interface)
- [x] Limites du plan gratuit signalées (veille, SQLite éphémère) dans l'interface et le README
