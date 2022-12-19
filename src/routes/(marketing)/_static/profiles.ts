import staticAssetUrl from '@/lib/util/staticAssetUrl';
import type { ComponentProps } from 'svelte';
import type Profile from '../_components/Profile.svelte';

const driesImg = staticAssetUrl('/profile-pictures/dries.png');
const manonImg = staticAssetUrl('/profile-pictures/manon.png');
const thorImg = staticAssetUrl('/profile-pictures/thor.png');
const wardImg = staticAssetUrl('/profile-pictures/ward.png');
const jannekeImg = staticAssetUrl('/profile-pictures/janneke.png');

export type ProfileData = ComponentProps<Profile> & { introHtml: string };
export const coreTeamProfiles: ProfileData[] = [
  {
    name: 'Dries',
    role: 'Co-founder',
    imageSrc: driesImg,
    introHtml:
      "Dries is the one who came up with WTMG. He bought his first tour bike when he was only 18, and biked from Brussels to Tokyo with Manon in 2019. His love for open data and open source led him to work for Open Knowledge Belgium for a few years, which is also where he met Ward and Thor. He's leading the WTMG team and his enthusiasm is utterly contagious!"
  },
  {
    name: 'Manon',
    role: 'Co-founder',
    imageSrc: manonImg,
    introHtml:
      'Manon is a true multipotentialite and has a solution for everything. She ran a marathon twice, cycled from Brussels to Tokyo with Dries, and made a beautiful film about it: <a href="https://womendontcycle.com/">‘Women Don’t Cycle’</a>. She\'s the only one on the team who studied tourism. The fact that she\'s fluent in four languages and feels very comfortable in front of a camera makes her our unofficial spokesperson!'
  },
  {
    name: 'Thor',
    role: 'Co-founder',
    imageSrc: thorImg,
    introHtml:
      'Thor is the genius technologist any project needs. He participated in Open Summer of Code twice, where he met Dries in 2017. In the same year, he cycled from Leuven to Helsinki. He is now a WTMG host there! Not only is he a fantastic developer, he’s a great designer as well. He loves cooking, coding and reading long intriguing articles!'
  },
  {
    name: 'Ward',
    role: 'Developer',
    imageSrc: wardImg,
    introHtml:
      'Ward is the most enthusiastic developer the world has ever seen! He went on a trip using WTMG only two days after he’d discovered it. Coincidentally, a journalist who wanted to write about WTMG took his picture and so he made it into a newspaper! He’s so eager to bring code to the world that we call him the “Push the button guy” on our team!'
  },
  {
    name: 'Janneke',
    role: 'Communications',
    imageSrc: jannekeImg,
    introHtml:
      'Janneke loves words and is absolutely amazing with them. As soon as she read about WTMG, she immediately suggested there should be a Facebook page and has been taking care of our communication ever since! She is head over heels in love with Romania; she wrote a guidebook about it, bought a house there, and founded Roamaniac.'
  }
];
