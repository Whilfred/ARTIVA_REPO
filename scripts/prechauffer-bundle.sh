#!/usr/bin/env bash
# =============================================================================
# ARTIVA — Préchauffer le bundle avant de scanner le QR code
# =============================================================================
# Expo Go abandonne au bout d'un certain temps et affiche « Something went
# wrong » sur fond bleu. Or la première compilation de ce projet prend environ
# 90 secondes (3 179 modules, ~12,8 Mo) : le téléphone n'attend pas jusque-là.
#
# Ce script demande le bundle depuis l'ordinateur, où aucun délai ne s'applique.
# Une fois construit, il reste en cache et est servi en moins d'une seconde :
# Expo Go le récupère alors sans problème.
#
# À lancer une fois, après « npx expo start », AVANT de scanner le QR.
# =============================================================================
set -e

PORT="${1:-8081}"
IP=$(hostname -I | awk '{print $1}')
BASE="http://$IP:$PORT"

echo "Serveur Metro : $BASE"

if ! curl -s -m 5 "$BASE/status" | grep -q "packager-status:running"; then
  echo
  echo "  Metro ne répond pas sur le port $PORT."
  echo "  Lance d'abord, dans un autre terminal :"
  echo "      cd front_end && npx expo start"
  exit 1
fi
echo "Metro répond."
echo

for PLATFORM in android ios; do
  echo "Compilation du bundle $PLATFORM (jusqu'à ~2 min la première fois)…"

  URL=$(curl -s -m 20 \
        -H "expo-platform: $PLATFORM" \
        -H "accept: application/expo+json,application/json" \
        "$BASE/" \
      | node -pe 'try{JSON.parse(require("fs").readFileSync(0,"utf8")).launchAsset.url}catch(e){""}')

  if [ -z "$URL" ]; then
    echo "  Impossible de lire le manifeste pour $PLATFORM — ignoré."
    continue
  fi

  RESULT=$(curl -s -m 600 "$URL" -o /dev/null -w "%{http_code} %{size_download} %{time_total}")
  set -- $RESULT
  CODE=$1; SIZE=$2; TIME=$3

  if [ "$CODE" = "200" ]; then
    # `printf %f` échoue en locale française (séparateur décimal virgule) :
    # on arrondit avec awk, qui reste insensible à la locale.
    SECONDS_ROUNDED=$(echo "$TIME" | awk '{printf "%d", $1 + 0.5}')
    echo "  $PLATFORM prêt : $((SIZE/1048576)) Mo en ${SECONDS_ROUNDED}s"
  else
    echo "  $PLATFORM : échec (HTTP $CODE)"
  fi
done

echo
echo "Bundles en cache. Tu peux scanner le QR code : le chargement sera quasi immédiat."
echo "(Le cache reste valide tant que tu ne relances pas Expo avec l'option -c.)"
