// This shared state is currently only used by the appUrlOpen handler in src/routes/[[lang]]/(stateful)/explore/+layout.svelte

let _shouldPanToGardenLocation = $state(false);
export const setShouldPanToGardenLocation = (val: boolean) => (_shouldPanToGardenLocation = val);
export const shouldPanToGardenLocation = () => _shouldPanToGardenLocation;
