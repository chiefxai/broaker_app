const { expo: staticConfig } = require('./app.json');

module.exports = ({ config = staticConfig } = {}) => {
  const existingPlugins = config.plugins ?? [];
  const plugins = existingPlugins.filter((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) !== 'react-native-maps');
  const nativeMapKeys = {};

  if (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS) {
    nativeMapKeys.iosGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS;
  }
  if (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID) {
    nativeMapKeys.androidGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID;
  }

  return {
    ...config,
    plugins: [
      ...plugins,
      ['react-native-maps', nativeMapKeys],
      ['expo-audio', { microphonePermission: 'Allow Broaker to record private field voice logs.' }],
    ],
  };
};
