import { goto as gt } from '$app/navigation';

export const goto = (path: string) => {
  gt(path).catch((e) => {
    console.error('goto error: ', e);
    window.location.href = path;
  });
};
