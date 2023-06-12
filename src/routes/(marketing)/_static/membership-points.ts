import mapScreenImg from '$lib/assets/value-points/map-screenshot.png?run&width=840';
import chatScreenImg from '$lib/assets/value-points/chat-screenshot.png?run&width=840';
import featuresScreenImg from '$lib/assets/value-points/features-screenshot.png?run&width=840';
import communityScreenImg from '$lib/assets/value-points/community-screenshot.png?run&width=840';
import type { ComponentProps } from 'svelte';
import type ValuePoint from '$routes/chat/[name]/[chatId]/ValuePoint.svelte';
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
        imgPath: undefined
      },
      {
        imgPath: undefined
      }
    ],
    getNodeArray('about-superfan.for-superfans-section.points', locale),
    merge
  );
