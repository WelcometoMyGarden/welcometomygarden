/**
 * Utilities to hydrate HTML in localization strings to Svelte Client-Side components,
 * for now only used for inline icons.
 */
import { Icon } from '$lib/components/UI';
import { camelCase, kebabCase } from 'lodash-es';
import { mount, unmount } from 'svelte';
import * as Sentry from '@sentry/sveltekit';
import logger from './logger';

const catalog = {
  Icon: Icon
};

export function componentAnchorHTML(
  component: string,
  props: Record<string, any>,
  outerClass?: string
) {
  return `<span ${
    outerClass ? `class="${outerClass}"` : ''
  } data-component="${component}" ${Object.entries(props)
    .map(([key, value]) => `data-prop-${kebabCase(key)}="${value}"`)
    .join(' ')}></span>`;
}

export function escapeHTMLForAttr(html: string) {
  var escape = document.createElement('textarea');
  escape.textContent = html;
  const escaped = escape.innerHTML.replaceAll('"', '&quot;');
  escape.remove();
  return escaped;
}

export const ClientIcon = (svgHTML: string) =>
  componentAnchorHTML('Icon', {
    icon: escapeHTMLForAttr(svgHTML),
    inline: true
  });

// Some naive html string prop coercion
function coerceValue(value: string) {
  // lowercase boolean
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  // use coercion for numbers
  // @ts-ignore
  if (!isNaN(value)) {
    return parseFloat(value);
  }
  return value;
}

function instantiateComponent(element: HTMLElement) {
  // let attrs = element.getAttributeNames();
  // let a = element.dataset

  let component: (typeof catalog)[keyof typeof catalog] | null = null;
  let props: { [key: string]: string } = {};
  for (let [key, value] of Object.entries(element.dataset)) {
    if (key === 'component') {
      component = catalog[value as keyof typeof catalog];
    } else if (key.startsWith('prop')) {
      // Note: the prop will be in camel case already
      // but it starts with a capital
      let propName = camelCase(key.slice('prop'.length));
      // @ts-ignore
      props[propName] = coerceValue(value!);
    }
  }

  if (!component) {
    return;
  }

  return mount(component, {
    target: element,
    // @ts-ignore
    props
  });
}

// From: https://github.com/dimfeld/website/blob/master/src/dynamicComponents.ts
export function instantiateComponents() {
  let elements = Array.from(document.querySelectorAll('[data-component]'));
  logger.debug(elements);
  let mountedComponents: {}[] = [];

  for (let div of elements) {
    let mountedComponent = instantiateComponent(div as HTMLElement);
    if (mountedComponent) {
      mountedComponents.push(mountedComponent);
    }
  }

  return () => {
    for (let component of mountedComponents) {
      try {
        unmount(component);
      } catch (e) {
        logger.error(e);
        Sentry.captureException(e, { extra: { context: 'Destroying dynamic components' } });
      }
    }
  };
}
