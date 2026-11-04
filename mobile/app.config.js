module.exports = ({ config }) => {
  return {
    ...config,
    plugins: [...(config.plugins ?? []), "expo-sharing"],
  };
};
