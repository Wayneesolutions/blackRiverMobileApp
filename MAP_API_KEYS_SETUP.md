# Map API Keys Setup Guide

This guide explains how to get API keys for MapTiler and Stadia Maps to use with MapLibre.

## Option 1: MapTiler (Recommended - What you're currently using)

### Steps to Get MapTiler API Key:

1. **Visit MapTiler**: Go to https://www.maptiler.com/
2. **Sign Up**: Click "Sign Up" and create a free account (no credit card required)
3. **Get Your API Key**:
   - After signing in, go to your account dashboard
   - Navigate to "API Keys" section
   - Copy your API key

### Free Tier:
- 100,000 map loads per month
- Perfect for development and small apps

### Usage:
The API key is used in the style URL:
```
https://api.maptiler.com/maps/streets/style.json?key=YOUR_API_KEY
```

---

## Option 2: Stadia Maps

### Steps to Get Stadia Maps API Key:

1. **Visit Stadia Maps**: Go to https://stadiamaps.com/
2. **Sign Up**: Create a free account (no credit card required)
3. **Create a Property**:
   - After signing in, go to "Manage Properties"
   - Create a new property (e.g., "My App")
4. **Generate API Key**:
   - Go to "Authentication Configuration"
   - Click "Generate API Key"
   - Copy your API key

### Free Tier:
- 2,000 requests per day
- Good for development

### Usage:
The API key is used in the style URL:
```
https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=YOUR_API_KEY
```

---

## Option 3: Free Demo Tiles (No API Key Needed)

If you don't want to sign up for an API key, you can use the free demo tiles:
```
https://demotiles.maplibre.org/style.json
```

**Note**: Demo tiles are for development only and have usage limits.

---

## How to Add API Keys to Your App

### Method 1: Environment Variables (.env file)

1. Create a `.env` file in the `DriverMobileApp` root directory (if it doesn't exist)
2. Add your API key:

```env
# For MapTiler
MAPTILER_API_KEY=your_maptiler_key_here

# OR for Stadia Maps
STADIA_API_KEY=your_stadia_key_here
```

3. Make sure your `.env` file is configured in `babel.config.js`:

```js
plugins: [
  ['module:react-native-dotenv', {
    moduleName: '@env',
    path: '.env',
  }]
]
```

### Method 2: EAS Build Environment Variables

If you're using EAS Build, add the keys in your `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "MAPTILER_API_KEY": "your_key_here"
      }
    }
  }
}
```

### Method 3: app.json (Not Recommended for Production)

You can also add it to `app.json` under `extra`, but this is less secure:

```json
{
  "expo": {
    "extra": {
      "maptilerApiKey": "your_key_here"
    }
  }
}
```

---

## Current Implementation

The app is configured to:
1. **First try MapTiler** if `MAPTILER_API_KEY` is set
2. **Then try Stadia Maps** if `STADIA_API_KEY` is set
3. **Fall back to free demo tiles** if neither is set

This is handled in `MapViewWithLiveTracking.tsx`:

```typescript
const getStyleUrl = () => {
  if (MAPTILER_API_KEY) {
    return `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_API_KEY}`;
  } else if (STADIA_API_KEY) {
    return `https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=${STADIA_API_KEY}`;
  } else {
    return 'https://demotiles.maplibre.org/style.json';
  }
};
```

---

## Quick Start

1. **Get a MapTiler API Key** (recommended):
   - Sign up at https://www.maptiler.com/
   - Copy your API key

2. **Add to .env file**:
   ```env
   MAPTILER_API_KEY=your_key_here
   ```

3. **Restart your app** - The map will automatically use your API key!

---

## Troubleshooting

### "Cannot read property 'eventTypes' of null"
- Make sure you've rebuilt the app (not just hot reload)
- Ensure MapLibre native modules are properly linked

### Map not loading
- Check if your API key is correct
- Verify the key is in your `.env` file
- Check console logs for error messages

### Rate limit errors
- Free tiers have usage limits
- Consider upgrading to a paid plan for production use

---

## Security Notes

⚠️ **Important**: Never commit API keys to version control!

- Add `.env` to your `.gitignore` file
- Use environment variables for production builds
- Rotate keys if they're accidentally exposed

