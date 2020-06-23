import { get } from 'svelte/store';
import { _, dictionary } from 'svelte-i18n';

export default (rootNode, currentLang, isArrayOfObjects = true) => {
  const dicValue = get(_);
  const fallback = get(dictionary).en;
  return Object.keys(fallback)
    .filter((key) => key.includes(rootNode))
    .reduce((all, key) => {
      const restOfNode = key.substring(key.indexOf(`${rootNode}.`) + rootNode.length + 1);
      const index = restOfNode.split('.')[0];
      const property = restOfNode.substr(index.length + 1);
      const value = { [property]: dicValue(`${rootNode}.${index}.${property}`) };
      if (!all[index]) all[index] = value;
      else all[index] = { ...all[index], ...value };
      return all;
    }, []);
};
