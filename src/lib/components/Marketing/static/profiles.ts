import type ProfilePicture from '$lib/components/Marketing//ProfilePicture.svelte';
import type { ComponentProps } from 'svelte';
import type Profile from '$lib/components/Marketing/Profile.svelte';

import manonImg from '$lib/assets/about-us/team/manon.jpg?w=124;248;372&as=run:0';
import driesImg from '$lib/assets/about-us/team/dries.jpg?w=124;248;372&as=run:0';
import thorImg from '$lib/assets/about-us/team/thor.jpg?w=124;248;372&as=run:0';

export type ProfileData = ComponentProps<typeof Profile> & { introHtml: string };
export type ProfileDataCompact = ComponentProps<typeof ProfilePicture>;
export const coreTeamProfiles: { [name: string]: ProfileDataCompact } = {
  dries: {
    name: 'Dries',
    imageSrc: driesImg
  },
  manon: {
    name: 'Manon',
    imageSrc: manonImg
  },
  thor: {
    name: 'Thor',
    imageSrc: thorImg
  }
};
