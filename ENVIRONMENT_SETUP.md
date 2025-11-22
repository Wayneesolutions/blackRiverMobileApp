# Environment Configuration Guide

## Overview

The app uses environment variables from `.env` file. The app will automatically use values from `.env` if they exist, otherwise it will use auto-detection.

## Environment Variables

The app reads these variables from `.env` file:

- `API_BASE_URL` - Your backend API URL (e.g., `http://192.168.31.247:3000/api/v1`)
- `SOCKET_URL` - Your WebSocket server URL (e.g., `http://192.168.31.247:3000`)
- `NODE_ENV` - Environment mode: `development`, `staging`, or `production`
- `DB_NAME` - Database name (usually `blackriver`)

## Quick Start

### 1. Set Development Environment (Default)

```bash
npm run env:dev
```

This will:
- Create `.env.development` if it doesn't exist
- Copy it to `.env`
- Show the current configuration

### 2. Set Staging Environment

```bash
npm run env:staging
```

### 3. Set Production Environment

```bash
npm run env:prod
```

## Environment Files

- `.env` - Active environment file (used by the app)
- `.env.development` - Development configuration
- `.env.staging` - Staging configuration
- `.env.production` - Production configuration

## How It Works

1. **Priority Order:**
   - ✅ `.env` file values (HIGHEST PRIORITY)
   - ⚠️ Auto-detection (if no .env values)
   - ⚠️ Fallback IPs (if auto-detection fails)

2. **The app checks for `.env` file first:**
   - If `API_BASE_URL` exists in `.env` → Uses it directly
   - If `SOCKET_URL` exists in `.env` → Uses it directly
   - Otherwise → Uses auto-detection

## Update Your Server IP

Edit `.env.development` (or create `.env` directly):

```env
API_BASE_URL=http://YOUR_SERVER_IP:3000/api/v1
SOCKET_URL=http://YOUR_SERVER_IP:3000
NODE_ENV=development
DB_NAME=blackriver
```

Then run:
```bash
npm run env:dev
```

## For EAS Builds

When building with EAS, the `.env` file is included in the build. Make sure to:

1. **Set the correct environment before building:**
   ```bash
   npm run env:prod  # For production build
   eas build --platform android --profile production
   ```

2. **Or use environment-specific builds:**
   ```bash
   # Development build
   npm run env:dev
   eas build --platform android --profile development
   
   # Production build
   npm run env:prod
   eas build --platform android --profile production
   ```

## Current Configuration

To see which environment is active:

```bash
cat .env
```

Or check the console logs when the app starts - it will show:
```
✅ .env file detected - skipping auto-detection
✅ Using .env API_BASE_URL: http://...
✅ Using .env SOCKET_URL: http://...
```

## Troubleshooting

### App not connecting to server?

1. **Check your `.env` file:**
   ```bash
   cat .env
   ```

2. **Verify the server IP is correct:**
   - Make sure your server is running
   - Check if the IP address is accessible from your device
   - For physical devices, use your computer's local IP (not localhost)

3. **Update the IP:**
   ```bash
   # Edit .env.development with your server IP
   # Then run:
   npm run env:dev
   ```

### Which environment is being used?

Check the console logs when the app starts. You'll see:
- `✅ .env file detected` - Using .env values
- `🚀 No .env values found` - Using auto-detection

## Example Workflow

```bash
# 1. Set development environment
npm run env:dev

# 2. Start the app
npm start

# 3. For production build
npm run env:prod
eas build --platform android --profile production
```

