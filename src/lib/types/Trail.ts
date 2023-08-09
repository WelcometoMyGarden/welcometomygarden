// Types trails

/** Trail as stored in Firebase */
export type FirebaseTrail = {
  /** slugified ID, used to find the Storage paht of the GeoJSON file */
  originalFileName: string;
  /**
   * Checksum for the referenced file.
   *
   * CRC32-C checksums are recommended by Cloud Storage, but the Firebase Metadata API
   * only includes MD5 hashes; so we're using/caching that here for consistency.
   * https://cloud.google.com/storage/docs/hashes-etags
   * https://firebase.google.com/docs/reference/js/storage.uploadmetadata.md#uploadmetadata_interface
   */
  md5Hash: string;
  visible: boolean;
};

/**
 * Local representation of a Trail
 */
export type LocalTrail = FirebaseTrail & {
  id: string;
  /** Whether the map should zoom in on this trail when it is added */
  animate: boolean;
};
