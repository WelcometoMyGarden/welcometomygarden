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
