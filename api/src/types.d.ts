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
