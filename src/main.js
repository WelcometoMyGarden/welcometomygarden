import HMR from '@roxi/routify/hmr';
import App from './components/App.svelte';

import './styles/reset.css';
import './styles/global.css';

const app = HMR(App, { target: document.body }, 'app-container');

export default app;

if ('serviceWorker' in navigator) {
  import('workbox-window').then(async ({ Workbox }) => {
    const wb = new Workbox('/service-worker.js');
    await wb.register();
    wb.addEventListener('installed', () => console.log('installed service worker'));
    wb.addEventListener('externalinstalled', () => console.log('installed service worker'));
  });
}
