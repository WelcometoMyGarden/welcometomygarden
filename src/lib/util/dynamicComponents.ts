/**
 * Utilities to hydrate HTML in localization strings to Svelte Client-Side components,
 * for now only used for inline icons.
 */
import { Icon } from '$lib/components/UI';
import { camelCase, kebabCase } from 'lodash-es';
import type { ComponentType, SvelteComponent } from 'svelte';

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
  if (!isNaN(value)) {
    return parseFloat(value);
  }
  return value;
}

function instantiateComponent(element: HTMLElement) {
  // let attrs = element.getAttributeNames();
  // let a = element.dataset

  let component: ComponentType | null = null;
  let props: { [key: string]: string } = {};
  for (let [key, value] of Object.entries(element.dataset)) {
    if (key === 'component') {
      component = catalog[value as keyof typeof catalog];
    } else if (key.startsWith('prop')) {
      // Note: the prop will be in camel case already
      // but it starts with a capital
      let propName = camelCase(key.slice('prop'.length));
      props[propName] = coerceValue(value!);
    }
  }

  if (!component) {
    return;
  }

  return new component({
    target: element,
    props
  });
}

// From: https://github.com/dimfeld/website/blob/master/src/dynamicComponents.ts
export default function instantiateComponents() {
  let elements = Array.from(document.querySelectorAll('[data-component]'));
  console.log(elements);
  let components: SvelteComponent[] = [];

  for (let div of elements) {
    let component = instantiateComponent(div as HTMLElement);
    if (component) {
      components.push(component);
    }
  }

  return () => {
    for (let component of components) {
      try {
        component.$destroy();
      } catch (e) {
        console.error(e);
      }
    }
  };
}
