import type { Readable } from 'svelte/store';
import type { _ } from 'svelte-i18n';
// Conditional inference, to extract the MessageFormatter type of the formatter store
type Flatten<T> = T extends Readable<infer U> ? U : T;
export type MessageFormatter = Flatten<typeof _>;
import { WTMG_BLOG_BASE_URL } from '$lib/constants';

export const anchorText = (props: {
  href: string;
  linkText: string;
  noopener?: boolean;
  noreferrer?: boolean;
  newtab?: boolean;
  style?: string;
  class?: string;
}) => {
  const defaults = {
    noopener: true,
    noreferrer: false,
    newtab: true
  };
  const {
    href,
    linkText,
    noopener,
    noreferrer,
    newtab,
    style,
    class: className
  } = { ...defaults, ...props };
  return `<a href="${href}" target="${newtab ? '_blank' : '_self'}" rel="${
    noopener ? 'noopener' : ''
  } ${noreferrer ? 'noreferrer' : ''}" style="${style ?? ''}" class="${
    className ?? ''
  }">${linkText}</a>`;
};

export const membershipBlogLink = (
  t: MessageFormatter,
  { utm_campaign, utm_content }: { utm_campaign?: string; utm_content?: string }
) => {
  const params = {
    utm_source: 'welcometomygarden.org',
    utm_medium: 'web',
    ...(utm_campaign ? { utm_campaign } : { utm_campaign: 'membership' }),
    ...(utm_content ? { utm_content } : undefined)
  };
  return `${WTMG_BLOG_BASE_URL}${t('generics.fair-model-blog-path')}?${new URLSearchParams(
    params
  ).toString()}`;
};
