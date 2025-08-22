import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'org.welcometomygarden.app2',
  appName: 'Welcome To My Garden',
  webDir: '../dist',
  server: {
    url:
      process.env.NODE_ENV === 'devpush'
        ? 'https://wtmg.thorgalle.com:5173'
        : 'https://staging.welcometomygarden.org'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false
    }
  }
};

export default config;
