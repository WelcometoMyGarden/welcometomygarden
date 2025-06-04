export type SuperfanLevelData = {
  copyKey: string;
  slug: SuperfanLevelSlug;
  value: number;
  stripePriceId: string | null;
  // title: string;
  // alt: string;
  // description: string;
};

// Importing env variables inside the below array seems to cause compiler issues
const { VITE_STRIPE_PRICE_ID_REDUCED, VITE_STRIPE_PRICE_ID_NORMAL } = import.meta.env;

export enum SuperfanLevelSlug {
  FREE = 'free',
  REDUCED = 'regular',
  NORMAL = 'superfan'
}

export const DEFAULT_MEMBER_LEVEL: SuperfanLevelSlug = SuperfanLevelSlug.REDUCED;

export const superfanLevels: SuperfanLevelData[] = [
  {
    slug: SuperfanLevelSlug.REDUCED,
    value: 3,
    stripePriceId: VITE_STRIPE_PRICE_ID_REDUCED,
    copyKey: '1'
  },
  {
    slug: SuperfanLevelSlug.NORMAL,
    value: 5,
    stripePriceId: VITE_STRIPE_PRICE_ID_NORMAL,
    copyKey: '2'
  }
];
