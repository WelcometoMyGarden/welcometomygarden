// Error codes
const FILE_INVALID_TYPE = 'file-invalid-type';
const FILE_TOO_LARGE = 'file-too-large';
const FILE_TOO_SMALL = 'file-too-small';
const TOO_MANY_FILES = 'too-many-files';

export interface FileError {
  code: string;
  message: string;
}

/**
 * A minimal, structural description of a file-like object.
 * Both `File`/`FileWithPath` and `DataTransferItem` satisfy this shape.
 */
export interface FileLike {
  type?: string;
  name?: string;
  size?: number;
}

// File Errors
const getInvalidTypeRejectionErr = (accept: string | string[]): FileError => {
  const normalized = Array.isArray(accept) && accept.length === 1 ? accept[0] : accept;
  const messageSuffix = Array.isArray(normalized) ? `one of ${normalized.join(', ')}` : normalized;
  return {
    code: FILE_INVALID_TYPE,
    message: `File type must be ${messageSuffix}`
  };
};

const getTooLargeRejectionErr = (maxSize: number): FileError => {
  return {
    code: FILE_TOO_LARGE,
    message: `File is larger than ${maxSize} bytes`
  };
};

const getTooSmallRejectionErr = (minSize: number): FileError => {
  return {
    code: FILE_TOO_SMALL,
    message: `File is smaller than ${minSize} bytes`
  };
};

export const TOO_MANY_FILES_REJECTION: FileError = {
  code: TOO_MANY_FILES,
  message: 'Too many files'
};

export function fileAccepted(
  file: FileLike,
  accept: string | string[]
): [boolean, FileError | null] {
  const isAcceptable = attributeAccept(file, accept);
  return [isAcceptable, isAcceptable ? null : getInvalidTypeRejectionErr(accept)];
}

export function fileMatchSize(
  file: FileLike,
  minSize?: number,
  maxSize?: number
): [boolean, FileError | null] {
  if (isDefined(file.size)) {
    if (isDefined(minSize) && isDefined(maxSize)) {
      if (file.size > maxSize) return [false, getTooLargeRejectionErr(maxSize)];
      if (file.size < minSize) return [false, getTooSmallRejectionErr(minSize)];
    } else if (isDefined(minSize) && file.size < minSize)
      return [false, getTooSmallRejectionErr(minSize)];
    else if (isDefined(maxSize) && file.size > maxSize)
      return [false, getTooLargeRejectionErr(maxSize)];
  }
  return [true, null];
}

function isDefined<T>(value: T): value is NonNullable<T> {
  return value !== undefined && value !== null;
}

/**
 * Whether `stopPropagation()` was already called on this event.
 * `cancelBubble` is deprecated, but it is the only way to ask a native event this, and it is
 * supported everywhere.
 */
export function isPropagationStopped(event: Event): boolean {
  return event.cancelBubble;
}

export function isEvtWithFiles(event: {
  dataTransfer?: DataTransfer | null;
  target?: (EventTarget & { files?: FileList | null }) | null;
}): boolean {
  if (!event.dataTransfer) {
    return !!event.target && !!event.target.files;
  }
  // Note: `application/x-moz-file` is not a legacy-Firefox workaround; current Firefox still
  // lists it alongside `Files` when dragging local files.
  // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types
  // https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Recommended_drag_types#file
  return Array.prototype.some.call(
    event.dataTransfer.types,
    (type: string) => type === 'Files' || type === 'application/x-moz-file'
  );
}

/**
 * Checks whether the file matches the MIME types in acceptedFiles
 * @param file
 * @param acceptedFiles
 * @returns
 */
function attributeAccept(file: FileLike, acceptedFiles: string | string[]): boolean {
  if (file && acceptedFiles) {
    const acceptedFileTypesArray = Array.isArray(acceptedFiles)
      ? acceptedFiles
      : acceptedFiles.split(',');
    const fileName = file.name || '';

    // The browser-reported MIME type of the file.
    const mimeType = (file.type || '').toLowerCase();
    const firstHalf = (m: string) => m.replace(/\/.*$/, '');
    const baseMimeType = firstHalf(mimeType);

    return acceptedFileTypesArray.some((type) => {
      const validType = type.trim().toLowerCase();
      if (validType.charAt(0) === '.') {
        // For extension specifiers like ".gpx", check that the extension matches the file name
        return fileName.toLowerCase().endsWith(validType);
      } else if (validType.endsWith('/*')) {
        // This is something like a wildcard image/* mime type,
        return baseMimeType === firstHalf(validType);
      }
      // exact match of the full MIME type
      return mimeType === validType;
    });
  }
  // Default to true in case acceptedFiles is falsy (which it is for us, in some cases)
  return true;
}
