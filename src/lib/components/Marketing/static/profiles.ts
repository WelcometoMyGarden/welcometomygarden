import staticAssetUrl from '$lib/util/staticAssetUrl';
import type ProfilePicture from '$lib/components/Marketing//ProfilePicture.svelte';
import type { ComponentProps } from 'svelte';
import type Profile from '$lib/components/Marketing/Profile.svelte';

const driesImg = staticAssetUrl('/profile-pictures/dries.png');
const manonImg = staticAssetUrl('/profile-pictures/manon.png');
const thorImg = staticAssetUrl('/profile-pictures/thor.png');

export type ProfileData = ComponentProps<Profile> & { introHtml: string };
export type ProfileDataCompact = ComponentProps<ProfilePicture>;
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
