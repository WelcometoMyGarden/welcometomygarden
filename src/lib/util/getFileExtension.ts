export default (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};
