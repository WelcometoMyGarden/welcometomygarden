import {
  bonfireIcon,
  electricityIcon,
  glassIcon,
  showerIcon,
  tentPhosphorLight,
  toiletIcon,
  waterIcon
} from '$lib/images/icons';
import type { GardenFacilities } from '$lib/types/Garden';
import { t } from 'svelte-i18n';
import { derived } from 'svelte/store';

export const facilities = derived(t, ($_) => {
  return [
    { name: 'water', icon: waterIcon, label: $_('garden.facilities.labels.water') },
    {
      name: 'drinkableWater',
      icon: glassIcon,
      label: $_('garden.facilities.labels.drinkable-water')
    },
    { name: 'toilet', icon: toiletIcon, label: $_('garden.facilities.labels.toilet') },
    { name: 'bonfire', icon: bonfireIcon, label: $_('garden.facilities.labels.bonfire') },
    {
      name: 'electricity',
      icon: electricityIcon,
      label: $_('garden.facilities.labels.electricity')
    },
    { name: 'shower', icon: showerIcon, label: $_('garden.facilities.labels.shower') },
    { name: 'tent', icon: tentPhosphorLight, label: $_('garden.facilities.labels.tent') }
  ] satisfies { name: keyof Omit<GardenFacilities, 'capacity'>; icon: string; label: string }[];
});
