# Razorpay in production: get the key working on EAS

This doc explains how to fix **"Razorpay Key ID is required"** when users open payments in the **production app** (the one you install from Play Store / built with EAS).

---

## What you need to do (3 steps)

### Step 1: Add two secrets in Expo

When your app is built on **EAS** (Expo’s servers), it does **not** see your `.env` files. You must give EAS the Razorpay keys as **Secrets**.

**Using Expo website (easiest):**

1. Go to **[expo.dev](https://expo.dev)** and sign in.
2. Open your **NexusOne / BestInfra** project.
3. In the left menu, open **Secrets** (under "Credentials" or "Project settings").
4. Click **Create secret** and add:

   | Secret name | Secret value |
   |-------------|--------------|
   | `EXPO_PUBLIC_RAZORPAY_KEY_ID` | Your Razorpay Key ID (e.g. `rzp_live_RtoHmSaBDCz4GS`) |
   | `EXPO_PUBLIC_RAZORPAY_SECRET_KEY` | Your Razorpay Secret Key (from [Razorpay Dashboard → API Keys](https://dashboard.razorpay.com/app/keys)) |

   Use the **exact** names above. The values are the same ones you have in your `.env` file.

**Using terminal instead:**

```bash
eas secret:create --name EXPO_PUBLIC_RAZORPAY_KEY_ID --value "rzp_live_XXXXXXXX" --scope project
eas secret:create --name EXPO_PUBLIC_RAZORPAY_SECRET_KEY --value "YourSecretKey" --scope project
```

Replace `rzp_live_XXXXXXXX` and `YourSecretKey` with your real keys.

---

### Step 2: Run a new production build

Secrets are only used when a **new** build runs. Your current production app was built **before** you added the secrets, so it still has no keys.

Run a new build:

```bash
eas build --profile production --platform android
```

When this build runs, EAS will inject the two secrets as environment variables. Your `app.config.js` will read them and put them into the app. The new APK/AAB will have the Razorpay keys inside.

---

### Step 3: Ship the new build

Upload the new build to Google Play (or TestFlight) and release it. Users who get this new version will have Razorpay working; the old version will still show the error until they update.

---

## Quick checklist

- [ ] Added **EXPO_PUBLIC_RAZORPAY_KEY_ID** in Expo project Secrets  
- [ ] Added **EXPO_PUBLIC_RAZORPAY_SECRET_KEY** in Expo project Secrets  
- [ ] Ran **eas build --profile production** (after adding secrets)  
- [ ] Uploaded the new build to the store and released it  

---

## Why this is needed (short version)

| Where you build | Does it see your .env? | So Razorpay keys come from |
|-----------------|------------------------|----------------------------|
| **Your computer** (e.g. `npx expo start`) | Yes | `.env` / `.env.production` → works |
| **EAS servers** (e.g. `eas build --profile production`) | No (.env is gitignored) | **EAS Secrets** only |

So:

- **Local / dev:** Your `.env` files are used → keys are there → no error.
- **Production (EAS):** No `.env` on the build machine → keys are empty unless you set **EAS Secrets** → then you must **rebuild** so the new build gets those secrets.

After you add the two secrets and run a new production build, the production app will have the Razorpay Key ID (and secret) and the error will go away.
