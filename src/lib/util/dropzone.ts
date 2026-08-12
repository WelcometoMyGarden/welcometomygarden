// Error codes
export const FILE_INVALID_TYPE = 'file-invalid-type';
export const FILE_TOO_LARGE = 'file-too-large';
export const FILE_TOO_SMALL = 'file-too-small';
export const TOO_MANY_FILES = 'too-many-files';

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
export const getInvalidTypeRejectionErr = (accept: string | string[]): FileError => {
  const normalized = Array.isArray(accept) && accept.length === 1 ? accept[0] : accept;
  const messageSuffix = Array.isArray(normalized) ? `one of ${normalized.join(', ')}` : normalized;
  return {
    code: FILE_INVALID_TYPE,
    message: `File type must be ${messageSuffix}`
  };
};

export const getTooLargeRejectionErr = (maxSize: number): FileError => {
  return {
    code: FILE_TOO_LARGE,
    message: `File is larger than ${maxSize} bytes`
  };
};

export const getTooSmallRejectionErr = (minSize: number): FileError => {
  return {
    code: FILE_TOO_SMALL,
    message: `File is smaller than ${minSize} bytes`
  };
};

export const TOO_MANY_FILES_REJECTION: FileError = {
  code: TOO_MANY_FILES,
  message: 'Too many files'
};

// Firefox versions prior to 53 return a bogus MIME type for every file drag, so dragovers with
// that MIME type will always be accepted
export function fileAccepted(
  file: FileLike,
  accept: string | string[]
): [boolean, FileError | null] {
  const isAcceptable = file.type === 'application/x-moz-file' || attributeAccept(file, accept);
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

export function allFilesAccepted({
  files,
  accept,
  minSize,
  maxSize,
  multiple
}: {
  files: FileLike[];
  accept: string | string[];
  minSize?: number;
  maxSize?: number;
  multiple: boolean;
}): boolean {
  if (!multiple && files.length > 1) {
    return false;
  }

  return files.every((file) => {
    const [accepted] = fileAccepted(file, accept);
    const [sizeMatch] = fileMatchSize(file, minSize, maxSize);
    return accepted && sizeMatch;
  });
}

// React's synthetic events has event.isPropagationStopped,
// but to remain compatibility with other libs (Preact) fall back
// to check event.cancelBubble
export function isPropagationStopped(
  event: Event & { isPropagationStopped?: () => boolean }
): boolean {
  if (typeof event.isPropagationStopped === 'function') {
    return event.isPropagationStopped();
  } else if (typeof event.cancelBubble !== 'undefined') {
    return event.cancelBubble;
  }
  return false;
}

export function isEvtWithFiles(event: {
  dataTransfer?: DataTransfer | null;
  target?: (EventTarget & { files?: FileList | null }) | null;
}): boolean {
  if (!event.dataTransfer) {
    return !!event.target && !!event.target.files;
  }
  // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types
  // https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Recommended_drag_types#file
  return Array.prototype.some.call(
    event.dataTransfer.types,
    (type: string) => type === 'Files' || type === 'application/x-moz-file'
  );
}

export function isKindFile(item: unknown): boolean {
  return typeof item === 'object' && item !== null && (item as { kind?: string }).kind === 'file';
}

function isIe(userAgent: string): boolean {
  return userAgent.indexOf('MSIE') !== -1 || userAgent.indexOf('Trident/') !== -1;
}

function isEdge(userAgent: string): boolean {
  return userAgent.indexOf('Edge/') !== -1;
}

export function isIeOrEdge(userAgent: string = window.navigator.userAgent): boolean {
  return isIe(userAgent) || isEdge(userAgent);
}

type ComposableEventHandler =
  ((event: Event, ...args: unknown[]) => void) | undefined | null | false;

/**
 * This is intended to be used to compose event handlers
 * They are executed in order until one of them calls `event.isPropagationStopped()`.
 * Note that the check is done on the first invoke too,
 * meaning that if propagation was stopped before invoking the fns,
 * no handlers will be executed.
 *
 * @param fns the event handler functions
 * @return the event handler to add to an element
 */
export function composeEventHandlers(...fns: ComposableEventHandler[]) {
  return (event: Event, ...args: unknown[]) =>
    fns.some((fn) => {
      if (!isPropagationStopped(event) && fn) {
        fn(event, ...args);
      }
      return isPropagationStopped(event);
    });
}

export function attributeAccept(file: FileLike, acceptedFiles: string | string[]): boolean {
  if (file && acceptedFiles) {
    const acceptedFilesArray = Array.isArray(acceptedFiles)
      ? acceptedFiles
      : acceptedFiles.split(',');
    const fileName = file.name || '';
    const mimeType = (file.type || '').toLowerCase();
    const baseMimeType = mimeType.replace(/\/.*$/, '');

    return acceptedFilesArray.some((type) => {
      const validType = type.trim().toLowerCase();
      if (validType.charAt(0) === '.') {
        return fileName.toLowerCase().endsWith(validType);
      } else if (validType.endsWith('/*')) {
        // This is something like a image/* mime type
        return baseMimeType === validType.replace(/\/.*$/, '');
      }
      return mimeType === validType;
    });
  }
  return true;
}
