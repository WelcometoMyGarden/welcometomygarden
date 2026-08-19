/**
 * Guards the `file-selector` integration behind `Dropzone.svelte` / `FileInput.svelte`.
 *
 * Since file-selector v4, `fromEvent` only guesses a MIME type from the extension for ~35 common
 * web types, so a `.gpx`/`.kml`/`.tcx`/`.geojson` file the browser left typeless now keeps
 * `type: ''`. That is safe as long as every `accept` list keeps its `.ext` entries next to any
 * MIME entries — `attributeAccept` matches an `.ext` against the file *name*, so it never needs
 * a guessed type.
 */
import { describe, expect, it } from 'vitest';
import { fromEvent, type FileWithPath } from 'file-selector';
import { fileAccepted, fileMatchSize } from '$lib/util/dropzone';
import { EXTRA_ACCEPT_VALUES, VALID_FILETYPE_EXTENSIONS } from '$lib/constants';

const accept = [...VALID_FILETYPE_EXTENSIONS.map((ft) => '.' + ft), ...EXTRA_ACCEPT_VALUES].join(
  ','
);

describe('file-selector v5 integration', () => {
  it('reads files from an <input type="file"> change event', async () => {
    const file = new File(['<gpx></gpx>'], 'route.gpx', { type: '' });
    const evt = { target: { files: [file] } } as unknown as Event;

    const files = (await fromEvent(evt)) as FileWithPath[];

    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('route.gpx');
    expect(files[0].path).toBe('./route.gpx');
    expect(files[0].relativePath).toBe('./route.gpx');
  });

  it('accepts the trail file types the modal asks for', async () => {
    for (const ext of VALID_FILETYPE_EXTENSIONS) {
      const file = new File([''], `route.${ext}`, { type: '' });
      const [files] = (await fromEvent({ target: { files: [file] } })) as FileWithPath[];
      expect(fileAccepted(files, accept), `.${ext}`).toEqual([true, null]);
      expect(fileMatchSize(files, 0, Infinity)).toEqual([true, null]);
    }
  });

  it('rejects other file types', async () => {
    const [file] = (await fromEvent({
      target: { files: [new File([''], 'cat.png', { type: 'image/png' })] }
    })) as FileWithPath[];
    const [accepted, error] = fileAccepted(file, accept);
    expect(accepted).toBe(false);
    expect(error?.code).toBe('file-invalid-type');
  });

  it('ignores OS junk files in a drop', async () => {
    const dropped = [
      new File([''], '.DS_Store', { type: '' }),
      new File([''], 'route.gpx', { type: '' })
    ];
    const evt = {
      type: 'drop',
      dataTransfer: {
        items: dropped.map((file) => ({ kind: 'file', getAsFile: () => file })),
        files: dropped
      }
    };

    const files = (await fromEvent(evt)) as FileWithPath[];
    expect(files.map((f) => f.name)).toEqual(['route.gpx']);
  });
});
