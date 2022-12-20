export type SuperfanLevelData = {
  title: string;
  slug: string;
  value: number;
  stripePriceId: string;
  alt: string;
  description: string;
};

// Importing env variables inside the below array seems to cause compiler issues
const {
  VITE_STRIPE_PRICE_ID_REDUCED,
  VITE_STRIPE_PRICE_ID_NORMAL,
  VITE_STRIPE_PRICE_ID_SOLIDARITY
} = import.meta.env;

export const superfanLevels: SuperfanLevelData[] = [
  {
    title: 'Reduced price',
    slug: 'sow',
    value: 3,
    stripePriceId: VITE_STRIPE_PRICE_ID_REDUCED,
    alt: 'Illustration of a seedling',
    description:
      'Are you a student or do you have a low income? We get it. You can opt for this reduced fee and still support us!'
  },
  {
    title: 'Normal price',
    slug: 'plant',
    value: 5,
    stripePriceId: VITE_STRIPE_PRICE_ID_NORMAL,
    alt: 'Illustration of a plant in a pot',
    description:
      'This is what we need each Superfan to pay on average. Can you pitch in so we can keep going?'
  },
  {
    title: 'Solidarity price',
    slug: 'grow',
    value: 10,
    stripePriceId: VITE_STRIPE_PRICE_ID_SOLIDARITY,
    alt: 'Illustration of a tree',
    description:
      'Would you like to contribute a bit more so that others who need it can pay less? That’s brilliant! Thank you!'
  }
];
