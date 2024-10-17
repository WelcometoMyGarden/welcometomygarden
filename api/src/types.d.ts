import type { FirestoreEvent as FE } from 'firebase-functions/firestore';
import type { DocumentSnapshot as DS } from '@google-cloud/firestore';
import type { CallableRequest as CR, Change as Ch } from 'firebase-functions';
import type { CallableContext as CC } from 'firebase-functions/v1/https';
import type { DocumentData } from 'firebase-admin/firestore';
declare global {
  // Shortcuts to often-used types
  type FirestoreEvent<T, Params = Record<string, string>> = FE<T, Params>;
  type DocumentSnapshot<T = DocumentData> = DS<T>;
  type DocumentReference<T = DocumentData> =
    import('firebase-admin/firestore').DocumentReference<T>;
  type CollectionReference<T> = import('firebase-admin/firestore').CollectionReference<T>;
  type Query<T = DocumentData> = import('firebase-admin/firestore').Query<T>;
  type QueryDocumentSnapshot<T = DocumentData> =
    import('firebase-functions/firestore').QueryDocumentSnapshot<T>;
  type Change<T> = Ch<T>;

  type UserPrivate = import('../../src/lib/models/User').UserPrivate;
  type UserPublic = import('../../src/lib/models/User').UserPublic;
  type UserRecord = import('firebase-admin/auth').UserRecord;
  type Garden = import('../../src/lib/types/Garden').Garden;
  type Chat = import('../../src/lib/types/Chat').FirebaseChat;
  type LocalChat = import('../../src/lib/types/Chat').LocalChat;

  type WrappedFunction = <T extends (...args: any[]) => any>(
    guard: boolean,
    func: T
  ) => (...args: Arguments<T>) => ReturnType<T> | undefined;

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
}
