# Security Guide - Razorpay Keys Protection

## ⚠️ CRITICAL SECURITY ISSUE RESOLVED

A Razorpay key was previously exposed in the codebase. This has been fixed, but **immediate action is required**.

## 🔒 Immediate Actions Required

### 1. **Rotate Your Exposed Razorpay Keys** (URGENT)

The key `rzp_live_RtoHmSaBDCz4GS` was exposed in Git history. You MUST:

1. **Log into Razorpay Dashboard**: https://dashboard.razorpay.com/app/keys
2. **Revoke the exposed key** immediately
3. **Generate new keys** (both Key ID and Secret Key)
4. **Update your `.env` file** with the new keys
5. **Update keys in all environments** (development, staging, production)

### 2. **Check Git History**

Even though the key is removed from current code, it exists in Git history:

```bash
# Check if key exists in Git history
git log --all --full-history --source -S "rzp_live_RtoHmSaBDCz4GS"

# If found, consider using git-filter-repo to remove from history
# OR create a new repository without the exposed key
```

### 3. **Monitor Razorpay Dashboard**

- Check for unauthorized transactions
- Review payment logs for suspicious activity
- Enable IP whitelisting if available
- Set up webhook alerts for unusual activity

## ✅ Security Fixes Applied

1. ✅ **Removed all hardcoded keys** from `src/services/paymentService.js`
2. ✅ **Updated `.gitignore`** to exclude all `.env` files
3. ✅ **Created `.env.example`** template file
4. ✅ **Added validation** - code now throws errors if keys are missing instead of using fallbacks

## 📋 How to Use Environment Variables

### Step 1: Create `.env` file

```bash
# Copy the example file
cp .env.example .env
```

### Step 2: Add your Razorpay keys

Edit `.env` and add your actual keys:

```env
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_YOUR_NEW_KEY_ID
EXPO_PUBLIC_RAZORPAY_SECRET_KEY=YOUR_NEW_SECRET_KEY
```

### Step 3: Verify `.env` is ignored

Check that `.env` is in `.gitignore`:

```bash
git check-ignore .env
# Should output: .env
```

### Step 4: Never commit `.env`

```bash
# Always check before committing
git status
# .env should NOT appear in the list
```

## 🛡️ Best Practices

1. **Never hardcode secrets** in source code
2. **Use environment variables** for all sensitive data
3. **Add `.env` to `.gitignore`** (already done)
4. **Use `.env.example`** to document required variables
5. **Rotate keys regularly** (every 90 days recommended)
6. **Use different keys** for development and production
7. **Enable 2FA** on Razorpay dashboard
8. **Monitor payment logs** regularly

## 🔍 How to Verify Keys Are Secure

### Check for exposed keys in code:

```bash
# Search for Razorpay keys in codebase
grep -r "rzp_live_\|rzp_test_" --exclude-dir=node_modules --exclude="*.md"
# Should return NO results
```

### Check Git history:

```bash
# Search Git history for exposed keys
git log --all -p -S "rzp_live_RtoHmSaBDCz4GS"
```

## 📞 Support

If you suspect unauthorized access:
1. **Immediately revoke** all Razorpay keys
2. **Contact Razorpay support**: https://razorpay.com/support/
3. **Review all transactions** in the dashboard
4. **Enable additional security** measures

## 🔄 Key Rotation Checklist

- [ ] Revoke old exposed key in Razorpay dashboard
- [ ] Generate new Key ID and Secret Key
- [ ] Update `.env` file with new keys
- [ ] Update production environment variables
- [ ] Update staging environment variables
- [ ] Update development environment variables
- [ ] Test payment flow with new keys
- [ ] Verify old key is no longer functional
- [ ] Monitor for any issues after rotation

---

**Last Updated**: After GitGuardian security alert
**Status**: ✅ Fixed - Keys removed from codebase
