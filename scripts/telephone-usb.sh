#!/usr/bin/env bash
# =============================================================================
# ARTIVA — Lancer l'app sur le téléphone via le câble USB
# =============================================================================
# À utiliser quand le Wi-Fi ne laisse pas passer la connexion entre le téléphone
# et l'ordinateur (Expo Go reste sur l'écran de chargement puis échoue).
#
# Principe : `adb reverse` fait passer deux ports par le câble USB. Le téléphone
# croit alors que Metro et l'API tournent sur lui-même (localhost), alors qu'il
# parle en réalité à cet ordinateur. Plus aucune dépendance au réseau Wi-Fi.
#
# Prérequis sur le téléphone (Android) :
#   1. Réglages > À propos du téléphone > taper 7 fois sur « Numéro de build »
#      pour débloquer les options de développement.
#   2. Réglages > Options de développement > activer « Débogage USB ».
#   3. Brancher le câble et accepter la demande d'autorisation qui s'affiche.
# =============================================================================
set -e

cd "$(dirname "$0")/.."

echo "1. Recherche du téléphone…"
adb start-server >/dev/null 2>&1 || true
DEVICES=$(adb devices | grep -w "device" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
  echo
  echo "   Aucun téléphone détecté."
  echo "   - le câble est-il branché (et pas seulement en mode recharge) ?"
  echo "   - le « Débogage USB » est-il activé dans les options de développement ?"
  echo "   - une demande d'autorisation attend peut-être sur l'écran du téléphone."
  echo
  adb devices -l
  exit 1
fi

adb devices -l | grep -w "device" | sed 's/^/   /'

echo
echo "2. Redirection des ports par le câble…"
adb reverse tcp:8081 tcp:8081   # Metro (le code de l'app)
adb reverse tcp:3001 tcp:3001   # l'API backend
adb reverse --list | sed 's/^/   /'

echo
echo "3. Démarrage d'Expo en mode localhost…"
echo "   Dans Expo Go, ouvrir :  exp://127.0.0.1:8081"
echo "   (ou appuyer sur « a » ici pour lancer l'app automatiquement)"
echo
cd front_end
exec npx expo start --localhost
