import { get } from 'svelte/store';
import { dictionary } from 'svelte-i18n';

// Copied from svelte-i18n types, because they don't export it.
interface LocaleDictionary {
  [key: string]: LocaleDictionary | string | Array<string | LocaleDictionary> | null;
}

/**
 *
 * @param nodePath path inside the language directory, example: 'index.faq.questions'
 * @returns Array of the keys of the children of the node
 */
export const getNodeKeys = (nodePath: string) => {
  // TODO: https://trello.com/c/bpULmQeT/2884-refactor-getnodechildren

  // Retrieve the key structure from the canonical `en` library
  const englishDict = get(dictionary).en;

  const pathComponents = nodePath.split('.');

  // Drill down the node tree
  const nodeValue = pathComponents.reduce<LocaleDictionary | null>((currentNode, pathComponent) => {
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

  if (nodeValue) {
    return Object.keys(nodeValue);
  }
  return [];
};
