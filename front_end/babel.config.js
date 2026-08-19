// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ✅ Désactiver reanimated pour Expo Go
      'react-native-reanimated/plugin'
    ]
  };
};