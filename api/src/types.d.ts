declare namespace Firebase {
  // Shortcuts to often-used types
  type UserPrivate = import('../../src/lib/models/User').UserPrivate;
  type UserPrivate = import('../../src/lib/models/User').UserPublic;
  type UserRecord = import('firebase-admin/auth').UserRecord;
  type CollectionReference<T> = import('firebase-admin/firestore').CollectionReference<T>;
  type Query<T> = import('firebase-admin/firestore').Query<T>;
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
