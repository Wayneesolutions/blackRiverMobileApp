# EAS Secrets Setup Guide

## What are EAS Secrets?

EAS Secrets allow you to securely store sensitive information (like API keys) without hardcoding them in your configuration files. They're stored encrypted on EAS servers and injected during the build process.

## Creating the Google Maps API Key Secret

**Note**: EAS is transitioning from `eas secret:*` to `eas env:*` commands. Use the new commands:

### Using New Commands (Recommended):
```bash
cd DriverMobileApp
eas env:create --name GOOGLE_MAPS_API_KEY --value AIzaSyCv8vuE1jOgt-F6Szqvfn1DPrQdbPn5aEI --scope project
```

### Using Legacy Commands (Still works, but deprecated):
```bash
cd DriverMobileApp
eas secret:create --name GOOGLE_MAPS_API_KEY --value AIzaSyCv8vuE1jOgt-F6Szqvfn1DPrQdbPn5aEI --scope project
```

**Your secret is already created!** ✅
- Name: `GOOGLE_MAPS_API_KEY`
- Scope: `project`
- This will be automatically available as an environment variable during EAS builds.

## How It Works

**EAS automatically injects secrets as environment variables** during builds. If you create a secret with the name `GOOGLE_MAPS_API_KEY`, it will be available as `process.env.GOOGLE_MAPS_API_KEY` during the build process.

**Note**: The `app.json` file still needs the actual API key value in `android.config.googleMapsApiKey` because Expo needs it at build time to generate the Android manifest. This is normal for Google Maps API keys since they're restricted by your app's package name/bundle ID in Google Cloud Console, so having them in the app bundle is expected.

For runtime access in your code (via `env.ts`), the secret will be available as an environment variable during builds.

## How Secrets Work

1. **Stored securely**: Secrets are encrypted and stored on EAS servers
2. **Injected at build time**: Available as environment variables during `eas build`
3. **Per-project or per-account**: Can be scoped to a specific project or your entire account

## Viewing Environment Variables/Secrets

To see all environment variables for your project (new command):
```bash
eas env:list
```

Or using the legacy command (deprecated):
```bash
eas secret:list
```

## Updating Secrets

To update a secret:
```bash
eas env:update --name GOOGLE_MAPS_API_KEY --value YOUR_NEW_VALUE --scope project
```

## Deleting Secrets

To delete a secret (new command):
```bash
eas env:delete --name GOOGLE_MAPS_API_KEY
```

Or using the legacy command (deprecated):
```bash
eas secret:delete --name GOOGLE_MAPS_API_KEY
```

## Important Notes

- **app.json**: The `android.config.googleMapsApiKey` must have the actual value (not a variable reference) because Expo needs it at build time. However, you can use a config plugin or build hook to inject it from environment variables.

- **eas.json**: Environment variables in the `env` section will automatically use secrets if they exist, or you can reference them directly.

## Current Setup

Your current configuration has:

1. **app.json** - Contains the actual API key in `android.config.googleMapsApiKey` (required for Android builds)
2. **app.json extra** - Contains the API key in `extra.googleMapsApiKey` (accessible at runtime via Constants)
3. **eas.json** - Environment variables (will use secrets if created)

## Two Options for Secrets:

### Option 1: Keep Current Setup (Recommended)
- Keep the API key in `app.json` as it is now
- Create the secret for future use or for build hooks
- This is fine because Google Maps API keys are restricted by package name/bundle ID

### Option 2: Use Secrets + Config Plugin (Advanced)
If you want to completely avoid hardcoding, you'd need to:
1. Create the secret
2. Create a custom Expo config plugin that reads the secret and injects it into `app.json` during build
3. This is more complex but fully secure

## Recommendation

For Google Maps API keys, **Option 1 is recommended** because:
- The key is restricted by your app's package name in Google Cloud Console
- It's standard practice to embed Maps API keys in mobile apps
- Simpler configuration and builds

The secret you create will still be useful for:
- Build hooks/scripts that might need the key
- Runtime access via environment variables (if needed)
- Future use cases where you want to avoid hardcoding

