export type SuperfanLevelData = {
  title: string;
  id: string;
  value: number;
  stripePriceId: string;
};
export const superfanLevels: SuperfanLevelData[] = [
  {
    title: 'Reduced price',
    id: 'reduced',
    value: 3,
    stripePriceId: 'price_1MAcGMDY48WHyD7GoNncm5nX'
  },
  {
    title: 'Normal price',
    id: 'normal',
    value: 5,
    stripePriceId: 'price_1MAcGbDY48WHyD7GY6TCMmoC'
  },
  {
    title: 'Solidarity price',
    id: 'solidarity',
    value: 7,
    stripePriceId: 'price_1MAcGzDY48WHyD7GVUZAbVcf'
  }
];
