import { get } from 'svelte/store';
import { dictionary } from 'svelte-i18n';

// Copied from svelte-i18n types, because they don't export it.
interface LocaleDictionary {
  [key: string]: LocaleDictionary | string | Array<string | LocaleDictionary> | null;
}

/**
 *
 * @param nodePath path inside the language directory, example: 'index.faq.questions'
 * @returns The reqruested node object. If the node does not exist, null
 */
export const getNode = (nodePath: string, locale = 'en') => {
  // TODO: https://trello.com/c/bpULmQeT/2884-refactor-getnodechildren

  // Retrieve the key structure from the canonical `en` library
  const englishDict = get(dictionary)[locale];

  const pathComponents = nodePath.split('.');

  // Drill down the node tree
  return pathComponents.reduce<LocaleDictionary | null>((currentNode, pathComponent) => {
    // Check if the current node is an object with more translation keys inside
    if (currentNode != null && typeof currentNode !== 'string' && !(currentNode instanceof Array)) {
      // If the requested key doesn't exist, return null
      if (!(pathComponent in currentNode)) {
        return null;
      }
      // Otherwise, drill deeper
      const nextNode = currentNode[pathComponent];
      // We know for sure this value is also a LocaleDictionary, but TS complains.
      return nextNode as LocaleDictionary;
    }
    // Otherwise stop here
    else {
      return currentNode;
    }
  }, englishDict);
};

/**
 *
 * @param nodePath path inside the language directory, example: 'index.faq.questions'
 * @returns Array of the keys of the children of the node. If the node does not exist,
 * an empty array will be returned.
 */
export const getNodeKeys = (nodePath: string) => {
  const nodeValue = getNode(nodePath);

  if (nodeValue) {
    return Object.keys(nodeValue);
  }
  return [];
};

/**
 * Gets the children of a keyed array-like translation node as a JS array
 */
export const getNodeArray = (nodePath: string, locale = 'en') => {
  return Object.entries(getNode(nodePath, locale) ?? {})
    .sort(([keyA], [keyB]) => +keyA - +keyB)
    .map(([, v]) => v);
};
