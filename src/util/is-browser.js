export default (b) => {
  const browser = b.toLowerCase();

  const browsers = {
    safari:
      /constructor/i.test(window.HTMLElement) ||
      ((p) => p.toString() === '[object SafariRemoteNotification]')(
        !window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification)
      ),
    firefox: typeof InstallTrigger !== 'undefined'
  };

  return browsers[browser];
};
