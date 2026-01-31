const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 👇 Alias support (replaces babel-plugin-module-resolver)
config.resolver.alias = {
  '@': path.resolve(__dirname),
};

// 👇 NativeWind + global.css
module.exports = withNativeWind(config, {
  input: './app/global.css',
});
