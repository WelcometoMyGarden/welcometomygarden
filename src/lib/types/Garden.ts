export type Garden = {
  id?: string;
  description: string;
  location: null | latLng;
  facilities: GardenFacilities;
  photo:
    | {
        files?: null | File | File[];
        data: null | string | string[];
      }
    | null
    | string
    | string[];
  listed: boolean;
};

type latLng = {
  latitude: number;
  longitude: number;
};

export type GardenFacilities = {
  capacity: number;
  toilets?: boolean;
  shower?: boolean;
  electricity?: boolean;
  water?: boolean;
  drinkableWater?: boolean;
  bonfire?: boolean;
  tent?: boolean;
};
