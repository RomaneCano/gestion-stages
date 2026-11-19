# Checklist de conformité à l'énoncé

## Partie 1 — Développement de l'API REST
- [x] API REST en Python / FastAPI
- [x] Un stage : id, nom de l'étudiant, entreprise d'accueil, intitulé, date de début, date de fin
- [x] Méthodes HTTP : GET, POST, PUT, DELETE (+ PATCH)
- [x] Base de données SQLite
- [x] Validation des données (champs non vides, date de fin ≥ date de début, note entre 0 et 20)

## Partie 2 — Tester l'API (Swagger / Postman)
- [x] Création d'un stage — `docs/screenshots/31` (et données invalides 422 — `32`)
- [x] Consultation de la liste — `33` (et d'un stage — `34`)
- [x] Modification — `35` (partielle — `36`)
- [x] Suppression — `38`
- [x] Comportement si le stage n'existe pas (404) — `37`, `39`
- [x] 22 tests automatisés (`pytest`)

## Partie 3 — Conteneurisation avec Docker
- [x] Dockerfile à la racine
- [x] Construire l'image — `docs/screenshots/50`
- [x] Lancer un conteneur — `51`
- [x] Vérifier que l'API fonctionne dans le conteneur — `51`, `53`, `54`
- [x] Accéder à la documentation Swagger — `55`

## Partie 4 — Déploiement sur Render
- [x] Code déposé sur GitHub (`RomaneCano/gestion-stages`)
- [x] Compte Render créé
- [x] Dépôt GitHub connecté à Render
- [x] Web Service : environnement Docker, plan gratuit
- [x] Déploiement lancé et terminé
- [x] URL publique récupérée : https://gestion-stages-r64g.onrender.com
- [ ] Nouvelle version redéployée après le `git push` (v2.0.0 visible dans la pastille « API en ligne »)
- [ ] Captures de l'application en ligne (page du service Render, journal de déploiement, Swagger sur l'URL publique)

## Livrables
- [x] Code source (dépôt GitHub)
- [x] Dockerfile
- [x] URL publique de l'API déployée
- [x] Courte documentation des endpoints (`README.md`)
- [x] Captures d'écran du fonctionnement de l'API (`docs/screenshots`)
- [ ] Captures du déploiement Render

## Fonctionnalités supplémentaires
- [x] Interface web ergonomique (tableau de bord, recherche, filtres, tri, fiche détaillée)
- [x] Visite guidée à la première connexion
- [x] Alertes « À surveiller », planning chronologique, statistiques, export CSV
- [x] Thème clair / sombre, affichage mobile, accessibilité clavier
- [x] Identité visuelle ISIS (logo, couleurs)

## Remarque de l'énoncé
- [x] Aucune donnée personnelle réelle (noms fictifs, rappel dans l'interface)
- [x] Limites du plan gratuit signalées (veille, SQLite éphémère) dans l'interface et le README
