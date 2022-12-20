import staticAssetUrl from '@/lib/util/staticAssetUrl';
import type ProfilePicture from '@/routes/(marketing)/_components/ProfilePicture.svelte';
import type { ComponentProps } from 'svelte';
import type Profile from '../_components/Profile.svelte';

const driesImg = staticAssetUrl('/profile-pictures/dries.png');
const manonImg = staticAssetUrl('/profile-pictures/manon.png');
const thorImg = staticAssetUrl('/profile-pictures/thor.png');
const wardImg = staticAssetUrl('/profile-pictures/ward.png');
const jannekeImg = staticAssetUrl('/profile-pictures/janneke.png');

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
  },
  ward: {
    name: 'Ward',
    imageSrc: wardImg
  },
  janneke: {
    name: 'Janneke',
    imageSrc: jannekeImg
  }
};
