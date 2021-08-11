import { get } from 'svelte/store';
import { dictionary } from 'svelte-i18n';

export default (node) => {
  const fallback = get(dictionary).en;
  const nodes = node.split('.');
  const nodeValue = nodes.reduce((acc, cur) => acc[cur], fallback);
  return Object.keys(nodeValue);
};
