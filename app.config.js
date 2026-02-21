/**
 * Expo app config. Loads environment-specific .env at build time only.
 * Injects apiBaseUrl, env, and Razorpay keys into extra. App code reads from config (Constants.expoConfig.extra).
 * No process.env in app bundle; only this file reads process.env (Node/build time).
 */

const path = require('path');
const fs = require('fs');

const ENV_NAMES = ['development', 'staging', 'production'];

// Resolve .env from project root (where app.config.js lives), not cwd, so it works when Metro runs from another dir
const projectRoot = path.resolve(__dirname);

function selectEnvFile() {
  const appEnv = process.env.APP_ENV || process.env.EAS_BUILD_PROFILE || process.env.NODE_ENV || 'production';
  const normalized = ENV_NAMES.includes(appEnv) ? appEnv : 'production';
  return normalized;
}

let env = {};
try {
  const dotenv = require('dotenv');
  const envName = selectEnvFile();
  const basePath = path.join(projectRoot, '.env');
  const envPath = path.join(projectRoot, `.env.${envName}`);

  // 1) Load base .env first (Razorpay, etc.)
  dotenv.config({ path: basePath });
  // 2) Load env-specific overrides
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
  // 3) If Razorpay keys are still empty, re-apply from base .env (in case env-specific overwrote with empty)
  const baseParsed = fs.existsSync(basePath) ? dotenv.parse(fs.readFileSync(basePath, 'utf8')) : {};
  const keyId = (process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '').trim();
  const secretKey = (process.env.EXPO_PUBLIC_RAZORPAY_SECRET_KEY || '').trim();
  if (!keyId && baseParsed.EXPO_PUBLIC_RAZORPAY_KEY_ID) {
    process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID = String(baseParsed.EXPO_PUBLIC_RAZORPAY_KEY_ID).trim();
  }
  if (!secretKey && baseParsed.EXPO_PUBLIC_RAZORPAY_SECRET_KEY) {
    process.env.EXPO_PUBLIC_RAZORPAY_SECRET_KEY = String(baseParsed.EXPO_PUBLIC_RAZORPAY_SECRET_KEY).trim();
  }

  env = process.env;
} catch (e) {
  // dotenv optional
}

// Parse .env file: use dotenv if available, else simple KEY=VALUE parser (no extra dependency required at runtime)
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    const dotenv = require('dotenv');
    return dotenv.parse(content);
  } catch {
    const out = {};
    content.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    });
    return out;
  }
}

module.exports = () => {
  const appJson = require('./app.json');
  const baseEnvPath = path.join(projectRoot, '.env');
  const baseEnv = parseEnvFile(baseEnvPath);
  const razorpayKeyId = (env.EXPO_PUBLIC_RAZORPAY_KEY_ID || baseEnv.EXPO_PUBLIC_RAZORPAY_KEY_ID || '').trim();
  const razorpaySecretKey = (env.EXPO_PUBLIC_RAZORPAY_SECRET_KEY || baseEnv.EXPO_PUBLIC_RAZORPAY_SECRET_KEY || '').trim();
  const apiBaseUrl = env.EXPO_PUBLIC_API_BASE_URL || 'https://api.bestinfra.app/gmr/api';
  const envName = (env.EXPO_PUBLIC_ENV || env.EXPO_PUBLIC_ENVIRONMENT || 'production').toLowerCase();
  const resolvedEnv = ENV_NAMES.includes(envName) ? envName : 'production';
  return {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      apiBaseUrl,
      env: resolvedEnv,
      razorpayKeyId,
      razorpaySecretKey,
      sentryDsn: env.EXPO_PUBLIC_SENTRY_DSN || env.SENTRY_DSN || baseEnv.EXPO_PUBLIC_SENTRY_DSN || baseEnv.SENTRY_DSN || '',
    },
  };
};
