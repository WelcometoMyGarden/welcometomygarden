export default (input: string) => {
  if (input.length > 0) {
    return input[0].toLocaleUpperCase() + input.substring(1);
  }
  return input;
};
