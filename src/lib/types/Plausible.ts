import type { SuperfanLevelSlug } from '$routes/(marketing)/_static/superfan-levels';

export enum PlausibleEvent {
  CREATE_ACCOUNT = 'Create Account',
  DELETE_ACCOUNT = 'Delete Account',
  SIGN_IN = 'Sign In',
  SIGN_OUT = 'Sign Out',
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
  SHOW_TRAIN_NETWORK = 'Show Train Network',
  EMAIL_UNSUBSCRIBE = 'Email Unsubscribe',
  EMAIL_RESUBSCRIBE = 'Email Resubscribe',
  VISIT_MANAGE_SUBSCRIPTION = 'Visit Manage Subscription',
  /**
   * Open the modal overlayed on the chat
   */
  OPEN_MEMBERSHIP_MODAL = 'Open Membership Modal',
  MEMBERSHIP_MODAL_BACK = 'Membership Modal Back Nav',
  /**
   * Decision to continue with a price
   */
  CONTINUE_WITH_PRICE = 'Membership Continue With Price',
  VISIT_ABOUT_MEMBERSHIP = 'Visit About Membership',
  /**
   * Only counts from the Pricing Section embeds (can still be done by non-superfans)
   */
  VISIT_RULES = 'Visit Rules',
  VISIT_MEMBERSHIP_FAQ = 'Visit Membership FAQ'
}

const superfanOnlyEvents = [
  PlausibleEvent.SET_GARDEN_VISIBILITY,
  PlausibleEvent.START_ROUTE_UPLOAD_FLOW,
  PlausibleEvent.UPLOAD_ROUTE,
  PlausibleEvent.SAVE_GARDEN,
  PlausibleEvent.UNSAVE_GARDEN,
  PlausibleEvent.SHOW_TRAIN_NETWORK,
  PlausibleEvent.VISIT_MANAGE_SUBSCRIPTION
] as const;
type SuperfanOnlyEvent = (typeof superfanOnlyEvents)[number];
export const isSuperfanOnlyEvent = (event: PlausibleEvent): event is SuperfanOnlyEvent =>
  (superfanOnlyEvents as ReadonlyArray<PlausibleEvent>).includes(event);

const nonSuperfanOnlyEvents = [
  PlausibleEvent.CREATE_ACCOUNT,
  PlausibleEvent.OPEN_MEMBERSHIP_MODAL,
  PlausibleEvent.MEMBERSHIP_MODAL_BACK,
  PlausibleEvent.CONTINUE_WITH_PRICE
] as const;
type NonSuperfanOnlyEvent = (typeof nonSuperfanOnlyEvents)[number];
export const isNonsuperfanOnlyEvent = (event: PlausibleEvent): event is NonSuperfanOnlyEvent =>
  (nonSuperfanOnlyEvents as ReadonlyArray<PlausibleEvent>).includes(event);

export type PlausibleCustomProperties = {
  [key: string]: string | boolean | number;
};

export type PlausibleGardenVisibilityProperties = {
  type: 'show_all' | 'show_saved' | 'hide_all';
};

export type PlausibleResponseRoleProperties = {
  role: 'host' | 'traveller';
};

export type PlausibleSubscriptionProperties = {
  list: 'newsletter' | 'new_chat';
};

export type PlausibleMembershipModalProperties = {
  source: 'map_garden' | 'direct';
};

export type PlausibleContinueWithPriceProperties = {
  membership_type: SuperfanLevelSlug;
};

export type PlausibleVisitAboutMembershipProperties = {
  source:
    | 'home_section'
    | 'top_navbar'
    | 'top_navbar_announcement'
    | 'side_navbar'
    | 'side_navbar_announcement';
};

export type PlausiblePricingSectionSourceProperties = {
  source: 'modal' | 'about_membership';
};
