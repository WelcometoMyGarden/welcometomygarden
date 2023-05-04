// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#basic_validation
// NOTE: the value of the type="email" field seems to be trimmed by the browser.
const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export default (s: string) => emailRegex.test(s);
