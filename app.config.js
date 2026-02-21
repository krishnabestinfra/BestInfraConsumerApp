/**
 * Expo app config. Loads environment-specific .env at build time only.
 * Injects apiBaseUrl, env, and Razorpay keys into extra. App code reads from config (Constants.expoConfig.extra).
 * No process.env in app bundle; only this file reads process.env (Node/build time).
 */

const path = require('path');

const ENV_NAMES = ['development', 'staging', 'production'];

function selectEnvFile() {
  const appEnv = process.env.APP_ENV || process.env.EAS_BUILD_PROFILE || process.env.NODE_ENV || 'production';
  const normalized = ENV_NAMES.includes(appEnv) ? appEnv : 'production';
  return normalized;
}

let env = {};
try {
  const dotenv = require('dotenv');
  const envName = selectEnvFile();
  const envPath = path.resolve(process.cwd(), `.env.${envName}`);
  const basePath = path.resolve(process.cwd(), '.env');
  dotenv.config({ path: envPath });
  dotenv.config({ path: basePath, override: false });
  env = process.env;
} catch (e) {
  // dotenv optional
}

module.exports = () => {
  const appJson = require('./app.json');
  const apiBaseUrl = env.EXPO_PUBLIC_API_BASE_URL || 'https://api.bestinfra.app/gmr/api';
  const envName = (env.EXPO_PUBLIC_ENV || env.EXPO_PUBLIC_ENVIRONMENT || 'production').toLowerCase();
  const resolvedEnv = ENV_NAMES.includes(envName) ? envName : 'production';
  return {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      apiBaseUrl,
      env: resolvedEnv,
      razorpayKeyId: env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
      razorpaySecretKey: env.EXPO_PUBLIC_RAZORPAY_SECRET_KEY || '',
      sentryDsn: env.EXPO_PUBLIC_SENTRY_DSN || env.SENTRY_DSN || '',
    },
  };
};
