export enum PlausibleEvent {
  CREATE_ACCOUNT = 'Create Account',
  SIGN_IN = 'Sign In',
  ADD_GARDEN = 'Add Garden',
  UPDATE_GARDEN = 'Update Garden',
  SEND_REQUEST = 'Send Request',
  SEND_RESPONSE = 'Send Response',
  SHOW_HIKING_ROUTES = 'Show Hiking Routes',
  SHOW_CYCLING_ROUTES = 'Show Cycling Routes',
  SHOW_GARDEN_FILTER = 'Show Garden Filter',
  VISIT_SEARCHED_LOCATION = 'Visit Searched Location',
  SET_GARDEN_VISIBILITY = 'Set Garden Visibility',
  START_ROUTE_UPLOAD_FLOW = 'Start Route Upload Flow',
  UPLOAD_ROUTE = 'Upload Route',
  SAVE_GARDEN = 'Save Garden',
  UNSAVE_GARDEN = 'Unsave Garden',
  SHOW_TRAIN_NETWORK = 'Show Train Network'
}

export type PlausibleCustomProperties = {
  [key: string]: string | boolean | number;
};

export type PlausibleGardenVisibilityProperties = {
  type: 'show_all' | 'show_saved' | 'hide_all';
};

export type PlausibleResponseRoleProperties = {
  role: 'host' | 'traveller';
};
