import type { FirestoreEvent as FE, FirestoreAuthEvent as FAE } from 'firebase-functions/firestore';
import type { DocumentSnapshot as DS } from '@google-cloud/firestore';
import type { CallableRequest as CR } from 'firebase-functions/https';
import type { CallableContext as CC } from 'firebase-functions/v1/https';
import type { TaskQueue as TQ } from 'firebase-admin/functions';
import type { Change as Ch } from 'firebase-functions';
import type { DocumentData } from '@google-cloud/firestore';
import type { MailDataRequired as MDR } from '@sendgrid/mail';
declare global {
  // Shortcuts to often-used types
  type FirestoreEvent<T, Params = Record<string, string>> = FE<T, Params>;
  type FirestoreAuthEvent<T, Params = Record<string, string>> = FAE<T, Params>;
  type DocumentSnapshot<T = DocumentData> = DS<T, T>;
  type DocumentReference<T = DocumentData> = import('firebase-admin/firestore').DocumentReference<
    T,
    T
  >;
  type CollectionReference<T> = import('firebase-admin/firestore').CollectionReference<T, T>;
  type Query<T = DocumentData> = import('firebase-admin/firestore').Query<T, T>;
  type QueryDocumentSnapshot<T = DocumentData> =
    import('@google-cloud/firestore').QueryDocumentSnapshot<T, T>;
  type Change<T> = Ch<T>;
  type TaskQueue<T> = TQ<T>;

  type UserPrivate = import('../../src/lib/models/User').UserPrivate;
  type UserPublic = import('../../src/lib/models/User').UserPublic;
  type UserRecord = import('firebase-admin/auth').UserRecord;
  type Garden = import('../../src/lib/types/Garden').Garden;
  type Chat = import('../../src/lib/types/Chat').FirebaseChat;
  type LocalChat = import('../../src/lib/types/Chat').LocalChat;
  type Message = import('../../src/lib/types/chat').FirebaseMessage;
  type PushRegistration = import('../../src/lib/types/PushRegistration').FirebasePushRegistration;
  type PushRegistrationStatus =
    import('../../src/lib/types/PushRegistration').PushRegistrationStatus;

  type WrappedFunction = <T extends (...args: any[]) => any>(
    guard: boolean,
    func: T
  ) => (...args: Arguments<T>) => ReturnType<T> | undefined;

  type ContactCreationCheckData = {
    uid: string;
    /**
     * The SendGrid contact upsert job ID
     */
    jobId: string;
    /**
     * Denotes how many attempts have been made to create this contact, including the ongoing attempt.
     * Used to cap retries in case of a contact creation failure.
     */
    attempt: number;
    /**
     * Which creationLanguage to add on a retry, if any.
     */
    creationLanguage: string | null;
  };

  type SendMessageReminderData = {
    chatId: string;
    senderUid: string;
  };

  type SendAbandonedCartReminderData = {
    uid: string;
    customerId: string;
  };

  type QueuedMessage =
    | {
        type: 'message_reminder';
        data: SendMessageReminderData;
      }
    | { type: 'abandoned_cart'; data: SendAbandonedCartReminderData };

  declare namespace FV1 {
    type CallableContext = CC;
  }

  /**
   * Functions v2
   */
  declare namespace FV2 {
    type CallableRequest<T = any> = CR<T>;
  }

  declare namespace Supabase {
    /**
     * Multi-value single (non-set) responses return a null value for every column when no result is returned.
     */
    type SingleResponse<T extends Record<string, any>> = T | { [key in keyof T]: null };

    type GetGmailNormalizedEmailResponse = SingleResponse<{
      id: string;
      email: string;
      normalized_gmail_handle: string;
      email_verified: boolean;
    }>;
  }

  declare namespace SendGrid {
    type MailDataRequired = MDR;

    /**
Empty values have an empty string result
   */
    type ContactDetails = {
      address_line_1: string;
      address_line_2: string;
      alternate_emails: string[];
      city: string;
      /**
2-letter; uppercase
     */
      email: string;
      first_name: string;
      id: string;
      last_name: string;
      list_ids: string[];
      segment_ids: string[];
      postal_code: string;
      state_province_region: string;
      phone_number: string;
      whatsapp: string;
      line: string;
      facebook: string;
      unique_name: string;
      country: string;
      custom_fields: Record<string, string | number>;
      /**
ISO date strings
     */
      created_at: string;
      updated_at: string;
    };

    type UnpackedInboundRequest = {
      text?: string;
      html?: string;
      envelope?: string;
      from?: string;
      dkim?: string;
      sender_ip?: string;
    };

    type ParsedInboundRequest = {
      envelopeFromEmail?: string;
      headerFrom?: addrparser.Address;
      responseText?: string;
      chatId?: string;
      dkimResult: {
        /**
         * Normalized to be lowercase, for reliable comparison.
         */
        host?: string;
        /**
         * This isn't well documented. These are the known possible values; string represents the unknown.
         */
        result?: 'pass' | 'fail' | string;
      };
      senderIP?: string;
      html?: string;
    };

    type CreateSendgridContactOpts = {
      /**
       * Use the { custom_fields: {} } sub-property for custom fields. If left empty, some extra requests will be made to collect the required details.
       */
      extraContactDetails?: null | {
        custom_fields?: Record<string, string | number>;
        [key: string]: object | string;
      };
      /**
       * The contact creation attempt number of this creation
       */
      attempt?: number;
      /**
       * defaults to false, may be set by setting this boolean, or the newsletter custom field to a 1 | 0 value. The latter takes precedence.
       */
      addToNewsletter?: boolean;
      /**
       * Whether the function should fetch contact details. defaults to true.
       */
      fetchContactDetails?: boolean;
    };
  }
}
