# Meteoweight

Classement statique des grandes villes francaises selon la meteo, genere a partir d’un ETL Node puis servi comme une application Angular deployable sur GitHub Pages.

## Installation

```bash
npm install
```

## Lancer l’application

```bash
npm run dev
```

L’application est servie sur [http://localhost:4200](http://localhost:4200).

## Regenerer les donnees

```bash
npm run etl
```

Le script ETL telecharge les donnees Meteo-France/Open-Meteo, agrege les metriques 2015-2024 et ecrit le payload statique dans `public/data/dashboard.json`.

## Etat utilisateur

Les favoris, presets nommes, colonnes masquees et filtres sont stockes localement dans le navigateur via `localStorage` sous la cle `meteoweight:user-state:v1`.

## Commandes utiles

```bash
npm run test
npm run test:front -- --watch=false
npm run test:etl
npm run build
```

## GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` construit l’application avec un `base-href` adapte au nom du repo, puis publie `dist/meteoweight/browser` sur GitHub Pages.
