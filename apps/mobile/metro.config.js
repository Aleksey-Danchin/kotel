const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

config.watchFolders = [path.resolve(projectRoot, "../backend/src")];
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@contracts": path.resolve(projectRoot, "../backend/src/contracts"),
};

module.exports = config;
