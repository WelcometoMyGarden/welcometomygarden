import { CapacitorConfig } from '@capacitor/cli';
import { config as dotEnvConfig } from 'dotenv';
import { resolve } from 'path';

dotEnvConfig({ path: resolve(process.cwd(), '.env.capacitor'), quiet: true });

const DEVPUSH_URL = process.env.DEVPUSH_URL;

let overrideConfig: Partial<CapacitorConfig>;
switch (process.env.NODE_ENV) {
  case 'prod':
    overrideConfig = {
      server: {
        url: 'https://welcometomygarden.org'
      },
      ios: {
        scheme: 'App'
      }
    };
    break;
  case 'beta':
    overrideConfig = {
      server: {
        url: 'https://beta.welcometomygarden.org'
      },
      ios: {
        scheme: 'App'
      }
    };
    break;
  case 'devpushprod':
    if (DEVPUSH_URL) {
      overrideConfig = {
        server: {
          // See tools/set-cf-ip.sh
          url: DEVPUSH_URL
        },
        ios: {
          scheme: 'App'
        }
      };
      break;
    }
    console.warn('No DEVPUSH_URL set, using default staging config');
  case 'devpush':
    if (DEVPUSH_URL) {
      overrideConfig = {
        server: {
          // See tools/set-cf-ip.sh
          url: 'https://wtmg.thorgalle.com:5173'
        },
        ios: {
          scheme: 'App Staging'
        }
      };
      break;
    }
    console.warn('No DEVPUSH_URL set, using default staging config');
  default:
    overrideConfig = {
      server: {
        url: 'https://staging.welcometomygarden.org'
      },
      ios: {
        scheme: 'App Staging'
      }
    };
    break;
}

const config: CapacitorConfig = {
  appId: 'org.welcometomygarden.app',
  appName: 'WTMG',
  zoomEnabled: false,
  // webDir: '../dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false
    },
    SystemBars: {
      insetsHandling: 'disable'
    },
    EdgeToEdge: {
      navigationBarColor: '#ffffff'
    }
  },
  ...overrideConfig
};

export default config;
