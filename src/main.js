import HMR from '@roxi/routify/hmr';
import App from './components/App.svelte';

import './styles/reset.css';
import './styles/global.css';

const app = HMR(App, { target: document.body }, 'app-container');

export default app;
