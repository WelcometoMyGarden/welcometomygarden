import { CapacitorConfig } from '@capacitor/cli';

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
  case 'devpush':
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
  appId: 'org.welcometomygarden.app2',
  appName: 'WTMG',
  // webDir: '../dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false
    }
  },
  ...overrideConfig
};

export default config;
