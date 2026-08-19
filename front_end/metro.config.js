// Learn more https://docs.expo.dev/guides/monorepos
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Ajout pour s'assurer que les extensions .mjs et .cjs sont résolues (parfois utile)
if (config.resolver && config.resolver.sourceExts) {
    if (!config.resolver.sourceExts.includes('mjs')) {
        config.resolver.sourceExts.push('mjs');
    }
    if (!config.resolver.sourceExts.includes('cjs')) {
        config.resolver.sourceExts.push('cjs');
    }
} else {
    // Fallback si la structure de config est différente
    config.resolver = {
        ...config.resolver,
        sourceExts: [...(config.resolver?.sourceExts || []), 'mjs', 'cjs'],
    };
}

// Expo Router Metro plugin (déjà géré par getDefaultConfig normalement, mais on peut le forcer si besoin)
// config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
// config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
// config.resolver.sourceExts.push('svg');

module.exports = config;