const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleClientSuffix = ".apps.googleusercontent.com";

if (iosClientId && !iosClientId.endsWith(googleClientSuffix)) {
  throw new Error("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must be a Google OAuth client ID.");
}

const iosUrlScheme = iosClientId
  ? `com.googleusercontent.apps.${iosClientId.slice(0, -googleClientSuffix.length)}`
  : null;

module.exports = ({ config }) => {
  const existingPlugins = (config.plugins ?? []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== "@react-native-google-signin/google-signin";
  });

  return {
    ...config,
    plugins: [
      ...existingPlugins,
      "expo-sharing",
      ...(iosUrlScheme
        ? [["@react-native-google-signin/google-signin", { iosUrlScheme }]]
        : []),
    ],
  };
};
