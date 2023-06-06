export type SuperfanLevelData = {
  copyKey: string;
  slug: string;
  value: number;
  stripePriceId: string;
  // title: string;
  // alt: string;
  // description: string;
};

// Importing env variables inside the below array seems to cause compiler issues
const { VITE_STRIPE_PRICE_ID_REDUCED, VITE_STRIPE_PRICE_ID_NORMAL } = import.meta.env;

// TODO CLEANUP

export const superfanLevels: SuperfanLevelData[] = [
  {
    slug: 'sow',
    value: 3,
    stripePriceId: VITE_STRIPE_PRICE_ID_REDUCED,
    copyKey: '0'
    // title: 'Reduced price',
    // alt: 'Illustration of a seedling',
    // description:
    //   'Are you a student or do you have a low income? We get it. You can opt for this reduced fee and still support us!'
  },
  {
    slug: 'plant',
    value: 5,
    stripePriceId: VITE_STRIPE_PRICE_ID_NORMAL,
    copyKey: '1'
    // title: 'Normal price',
    // alt: 'Illustration of a plant in a pot',
    // description:
    //   'This is what we need each Superfan to pay on average. Can you pitch in so we can keep going?'
  }
];
