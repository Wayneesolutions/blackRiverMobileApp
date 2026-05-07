// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const webStubs = {
  'react-native-maps': './src/utils/webMapsStub.js',
  'react-native-webrtc': './src/utils/webRTCStub.js',
  'react-native-incall-manager': './src/utils/inCallManagerStub.js',
};

const resolveWebStub = (moduleName) => {
  for (const [pkg, stub] of Object.entries(webStubs)) {
    if (moduleName === pkg || moduleName.startsWith(pkg + '/')) {
      return require.resolve(stub);
    }
  }
  return null;
};

const originComesFromStubbed = (originPath) => {
  return Object.keys(webStubs).some(pkg =>
    originPath.includes(`node_modules/${pkg}`) || originPath.includes(pkg)
  );
};

// Store original resolveRequest if it exists
const originalResolveRequest = config.resolver?.resolveRequest;

const webResolver = (context, moduleName, platform) => {
  if (platform === 'web') {
    const stub = resolveWebStub(moduleName);
    if (stub) return { filePath: stub, type: 'sourceFile' };

    const originPath = context.originModulePath || '';
    if (originPath && originComesFromStubbed(originPath)) {
      return { filePath: require.resolve('./src/utils/webMapsStub.js'), type: 'sourceFile' };
    }
  }
  if (originalResolveRequest) return originalResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver = { ...config.resolver, resolveRequest: webResolver };

// Suppress the expo-platform error by providing a default platform
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Ensure req.query exists
      if (!req.query) {
        req.query = {};
      }
      
      // Auto-detect platform from User-Agent if missing
      if (!req.headers['expo-platform'] && !req.query.platform) {
        const userAgent = req.headers['user-agent'] || '';
        if (userAgent.includes('Android') || userAgent.includes('android')) {
          req.query.platform = 'android';
          req.headers['expo-platform'] = 'android';
        } else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iOS')) {
          req.query.platform = 'ios';
          req.headers['expo-platform'] = 'ios';
        } else {
          // Default to android
          req.query.platform = 'android';
          req.headers['expo-platform'] = 'android';
        }
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;

