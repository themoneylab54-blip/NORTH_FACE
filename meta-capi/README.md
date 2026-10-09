# Conversion API Meta : relais Cloudflare

Le thème envoie chaque événement (PageView, ViewContent, AddToCart, InitiateCheckout) au pixel du navigateur et à ce relais, avec le même identifiant d'événement : Meta les déduplique et compte chaque événement une seule fois.

Le relais garde le token Conversion API côté serveur. Le token ne va jamais dans le thème : le code du thème est lisible par n'importe quel visiteur.

## Mise en place (10 minutes, gratuit)

1. Crée un compte gratuit sur https://dash.cloudflare.com.
2. Ouvre Workers & Pages, puis Create, puis Create Worker. Nomme-le `colandcie-events` et clique sur Deploy.
3. Clique sur Edit code. Remplace tout le code par le contenu de `worker.js`, puis clique sur Deploy.
4. Va dans Settings, puis Variables and Secrets, puis Add :
   - Type : **Secret** ;
   - Nom : `META_ACCESS_TOKEN` ;
   - Valeur : ton token Conversion API. Régénère-le d'abord dans le Gestionnaire d'événements s'il a circulé en clair.

   Enregistre, puis Deploy.
5. Copie l'adresse du Worker. Elle a la forme `https://colandcie-events.<ton-compte>.workers.dev`.
6. Dans Shopify, ouvre Boutique en ligne, puis Thèmes, puis Personnaliser, puis Paramètres du thème, puis **Meta Pixel**. Colle l'adresse dans « Conversions API relay URL » et enregistre.

Les noms de menus Cloudflare peuvent varier légèrement.

## Test

1. Dans le Gestionnaire d'événements Meta, ouvre Tester les événements et copie le code de test (`TEST…`).
2. Dans Cloudflare, ajoute une variable de type **Text** : `META_TEST_EVENT_CODE` = ce code. Puis Deploy.
3. Ouvre colandcie.com en navigation privée, puis accepte les cookies si la bannière s'affiche. Ensuite, regarde un produit, ajoute-le au panier et clique sur Checkout.
4. Chaque événement doit apparaître une fois, avec deux sources, « Navigateur » et « Serveur », marqué « dédupliqué ».
5. Supprime ensuite `META_TEST_EVENT_CODE`, puis Deploy. En mode test, le relais attend la réponse de Meta à chaque événement.

## Si un événement serveur n'arrive pas

- En mode test, la réponse de Meta s'affiche dans l'onglet Réseau du navigateur (requête vers `workers.dev`).
- Une erreur de version d'API : change `API_VERSION` en haut de `worker.js` pour la version indiquée par Meta, puis Deploy.
- Une erreur de token : vérifie le secret `META_ACCESS_TOKEN`.
- Un code 403 : l'adresse de la boutique n'est pas dans `ALLOWED_ORIGINS` en haut de `worker.js`.
