import { get } from 'svelte/store';
import { dictionary } from 'svelte-i18n';

// Copied from svelte-i18n types, because they don't export it.
export interface LocaleDictionary {
  [key: string]: LocaleDictionary | string | Array<string | LocaleDictionary> | null;
}

// TODO: probably much of these uses could be replaced with the JSON formatter?
// https://github.com/kaisermann/svelte-i18n/blob/main/docs/Formatting.md#jsonmessageid-string

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
 * Gets the children of a keyed array-like translation node as a JS array.
 * Example {"0": "trans1", "1": "trans2"} -> [trans1, trans2]
 * This essentially changes the prototype of the object to the Array prototype.
 */
export const toArray = (
  arrayLikeObject: LocaleDictionary | undefined
): Array<LocaleDictionary | null | string> | undefined => {
  if (arrayLikeObject instanceof Array) {
    return arrayLikeObject;
  }
  if (arrayLikeObject && typeof arrayLikeObject != 'string') {
    return Object.entries(arrayLikeObject)
      .sort(([keyA], [keyB]) => +keyA - +keyB)
      .map(([, v]) => v) as Array<LocaleDictionary | null | string>;
  }

  return undefined;
};

/**
 * Gets the children of a keyed array-like translation node as a JS array
 */
export const getNodeArray = (nodePath: string, locale = 'en') => {
  return toArray(getNode(nodePath, locale) ?? {});
};
