import { get } from 'svelte/store';
import { _, dictionary, locale } from 'svelte-i18n';

export default (rootNode, isArrayOfObjects = true) => {
  const dicValue = get(_);
  return Object.keys(get(dictionary)[get(locale)])
    .filter((key) => key.includes(rootNode))
    .reduce((all, key) => {
      const restOfNode = key.substring(key.indexOf(`${rootNode}.`) + rootNode.length + 1);
      const index = restOfNode.charAt(0);
      const property = restOfNode.substr(2);
      const value = { [property]: dicValue(`${rootNode}.${index}.${property}`) };
      if (!all[index]) all[index] = value;
      else all[index] = { ...all[index], ...value };
      return all;
    }, []);
};
