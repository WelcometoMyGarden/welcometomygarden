import mapScreenImg from '$lib/assets/value-points/map-screenshot.png?run&width=840';
import chatScreenImg from '$lib/assets/value-points/chat-screenshot.png?run&width=840';
import featuresScreenImg from '$lib/assets/value-points/features-screenshot.png?run&width=840';
import communityScreenImg from '$lib/assets/value-points/community-screenshot.png?run&width=840';
import activitiesImg from '$lib/assets/value-points/activities.png?run&width=840&lqip=0';
import teamImg from '$lib/assets/value-points/team-pic.jpg?run&width=1280';
import type { ComponentProps } from 'svelte';
import type ValuePoint from '$routes/(marketing)/(membership)/ValuePoint.svelte';
import { merge, zipWith } from 'lodash-es';
import { getNodeArray } from '$lib/util/get-node-children';
type ValuePointProps = ComponentProps<ValuePoint>;
export const valuePoints: (locale: string) => ValuePointProps[] = (locale) =>
  zipWith(
    [
      {
        imgPath: mapScreenImg
      },
      {
        imgPath: chatScreenImg
      },
      {
        imgPath: featuresScreenImg
      },
      {
        imgPath: communityScreenImg
      },
      {
        imgPath: activitiesImg,
        contain: true
      },
      {
        imgPath: teamImg
      }
    ],
    getNodeArray('about-superfan.for-superfans-section.points', locale),
    merge
  ) as ValuePointProps[];
