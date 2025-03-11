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
  VISIT_MEMBERSHIP_FAQ = 'Visit Membership FAQ',
  /*
   * Notifications
   * Legacy: worked around Plausible bug by not having subproperties
   * (bug was solved in 2025/03)
   */
  ENABLE_NOTIFICATIONS_CHAT = 'Turn on notifications (from chat)',
  ENABLE_NOTIFICATIONS_ACCOUNT = 'Turn on notifications (from account)',
  REMOVE_NOTIFICATIONS = 'Remove notifications',
  /**
   * Internal/background notification operations, triggered on the *actual* deletion of a Push Registration
   * (not the user's intent, for that, see REMOVE_NOTIFICATIONS)
   */
  DELETED_PUSH_REGISTRATION = 'Deleted push registration',
  /**
   * Internal/background notification operations
   */
  REFRESHED_PUSH_REGISTRATION = 'Refreshed push registration'
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
  /**
   * zoom_notice: in 2025/03 it got since we started showing the modal instead of navigating to /about-membership.
   */
  source: 'map_garden' | 'direct' | 'zoom_notice';
};

export type PlausibleMembershipModalBackNavSource = {
  /**
   * chat_browser: when the modal was exited using the navbar
   *   Before 2025/03/06 this was the only event that was tracked, without properties.
   * chat_close: when the modal was closed by clicking on the close button on mobile
   *   or outside the frame. This is possible since early 2025/03.
   * map_close: when the modal was closed by clicking on the close button on moile
   *   or outside the frame, and the modal was spawned on the map.
   */
  source: 'chat_browser' | 'chat_close' | 'map_close';
};

export type PlausibleContinueWithPriceProperties = {
  membership_type: SuperfanLevelSlug;
};

export type PlausibleVisitAboutMembershipProperties = {
  /**
   * The zoom_notice source exited since 2023/11,
   * In 2025/03 it got removed since we started showing the modal instead (see PlausibleMembershipModalProperties)
   */
  source:
    | 'home_section'
    | 'top_navbar'
    | 'top_navbar_announcement'
    | 'side_navbar'
    | 'side_navbar_announcement'
    | 'zoom_notice';
};

export type PlausiblePricingSectionSourceProperties = {
  source: 'modal' | 'about_membership';
};

export type PlausibleNotificationsInternalDeletionProperties = {
  /**
   * detached: we're deleting a push registration on a device,
   *   where there was no linked Firebase Push Registration found
   * other: we're deleting the push registration because another device marked it for deletion
   * own: we're deleting the push registration registered to the device/browser itself
   */
  type: 'detached' | 'own' | 'other';
};
