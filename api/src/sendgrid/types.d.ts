declare namespace SendGrid {

  /**
   * Empty values have an empty string result
   */
  type ContactDetails = {
    address_line_1: string,
    address_line_2: string,
    alternate_emails: string[],
    city: string,
    /**
     * 2-letter; uppercase
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
    custom_fields: Record<string, string | number>
    /**
     * ISO date strings
     */
    created_at: string;
    updated_at: string;
  };

}
