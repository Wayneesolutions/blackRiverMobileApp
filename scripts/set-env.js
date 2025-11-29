// scripts/set-env.js
const fs = require('fs');
const path = require('path');

const environments = {
  development: '.env.development',
  staging: '.env.staging',
  production: '.env.production',
};

// Environment configurations
const envConfigs = {
  development: {  
    API_BASE_URL: 'http://192.168.31.247:3000/api/v1',
    SOCKET_URL: 'http://192.168.31.247:3000',
    NODE_ENV: 'development',
    DB_NAME: 'blackriver',
  },
  staging: {
    API_BASE_URL: 'https://staging-api.blackriver.com/api/v1',
    SOCKET_URL: 'https://staging-api.blackriver.com',
    NODE_ENV: 'staging',
    DB_NAME: 'blackriver-staging',
  },
  production: {
    API_BASE_URL: 'https://portal.logistiqinnovations.ca/api/v1',
    SOCKET_URL: 'https://portal.logistiqinnovations.ca',
    NODE_ENV: 'production',
    DB_NAME: 'blackriver-prod',
  },
};

function setEnvironment(env) {
  if (!environments[env]) {
    console.error(`❌ Invalid environment: ${env}`);
    console.log('Available environments:', Object.keys(environments).join(', '));
    process.exit(1);
  }

  const envFile = environments[env];
  const envPath = path.join(__dirname, '..', envFile);

  // Create env file if it doesn't exist
  if (!fs.existsSync(envPath)) {
    console.log(`📝 Creating ${envFile} file...`);
    const envConfig = envConfigs[env];
    let content = '';
    for (const [key, value] of Object.entries(envConfig)) {
      content += `${key}=${value}\n`;
    }
    fs.writeFileSync(envPath, content);
    console.log(`✅ Created ${envFile}`);
  }

  const targetPath = path.join(__dirname, '..', '.env');

  try {
    // Copy the environment file
    fs.copyFileSync(envPath, targetPath);
    
    console.log(`✅ Environment set to: ${env}`);
    console.log(`📁 Copied ${envFile} to .env`);
    
    // Display current configuration
    const envContent = fs.readFileSync(targetPath, 'utf8');
    console.log('\n📋 Current configuration:');
    console.log(envContent);
  } catch (error) {
    console.error(`❌ Error setting environment: ${error.message}`);
    process.exit(1);
  }
}

// Get environment from command line argument
const env = process.argv[2];

if (!env) {
  console.log('🔧 Environment Switcher for Black River Logistics');
  console.log('Usage: node scripts/set-env.js <environment>');
  console.log('\nAvailable environments:');
  Object.keys(environments).forEach(key => {
    console.log(`  - ${key}`);
  });
  process.exit(1);
}

setEnvironment(env);

