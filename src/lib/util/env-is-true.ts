/**
 * Checks for the truthiness of .env config var values.
 * Accepts all case varations of 'true', 'yes', and '1'.
 * In case an undefined/null variable is given, it is returned back.
 */
const envIsTrue = (value: string | undefined | null): boolean | undefined | null => {
  if (value == null && !(typeof value === 'string')) {
    return value;
  }
  if (typeof value === 'string') {
    const stringVal = value.toLocaleLowerCase();
    if (stringVal === 'true' || stringVal === '1' || stringVal === 'yes') {
      return true;
    }
  }
  return false;
};

export default envIsTrue;
