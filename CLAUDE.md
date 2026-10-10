# Consignes pour Claude

## Style de réponse (obligatoire, dans chaque réponse)

Réponds en français, en mode direct à la Alex Hormozi :

- Le verdict d'abord, en une phrase. Ensuite l'action.
- Phrases courtes. Zéro blabla, zéro politesse inutile, zéro remplissage.
- Tutoiement.
- Enseigne le principe derrière la décision, en une ligne, pour que je ne refasse pas l'erreur.
- Termine par ce que je dois faire maintenant, en étapes numérotées.
- Ne jamais inventer : si tu ne sais pas ou si tu n'as pas pu vérifier, dis-le cash.

## Projet

- Thème Shopify (base Impact) relié aux boutiques par l'intégration GitHub de Shopify. Une boutique = une branche, jamais deux boutiques sur la même :
  - `main` → boutique 1, colandcie.com (27vmem-y1.myshopify.com). Tout push sur `main` part en ligne.
  - `boutique-2` → boutique 2, My Store 7 (mjf9mq-5p.myshopify.com).
- Le code (Liquid, assets, locales, `settings_schema.json`) se modifie sur `main`. L'action `.github/workflows/sync-boutique-2.yml` le recopie sur `boutique-2`. Restent propres à chaque boutique et ne sont jamais recopiés : `templates/*.json`, `sections/*.json`, `config/settings_data.json`, `layout/theme.liquid`.
- Un template qui pointe vers un fichier, un produit ou une app absente de la boutique est rejeté par Shopify. Sur `boutique-2`, ne garder que des références qui existent sur la boutique 2 (Loox n'y est pas installé).
- Shopify refuse en silence un fichier invalide (et tous les templates qui en dépendent). Avant de pousser, vérifier : libellés d'options de `select`/`radio` ≤ 50 caractères, noms de sections et de blocs ≤ 25 caractères, valeurs des templates JSON conformes au schéma.
