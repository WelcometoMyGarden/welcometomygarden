Check the [API docs](../api/README.md) on how to update the storage-resize-images extension.

Extension configuration parameters are mainly explained [in the Firebase Docs](https://github.com/firebase/extensions/blob/master/storage-resize-images/README.md#:~:text=configuration%20parameters), but their .env key names are not mentioned there.

Here are some additional notes on the configuration parameters:

- `DELETE_ORIGINAL_FILE`: This was false in the originally committed version, but in the production .env it was true anyway, probably from the summer of 2020 to March 2025.
  On March 10, 2025, I decided to stop deleting originals for two reasons:
  1. insurance against storage-resize-images bugs/errors (we can retry the resize),
  2. opens the possibility to generate higher-quality or different derivatives if needed.
- `IMAGE_BUCKET`: should be changed depending on the target environment:
  ```
  IMG_BUCKET=demo-test.appspot.com
  IMG_BUCKET=wtmg-dev.appspot.com
  IMG_BUCKET=wtmg-production.appspot.com
  ```
- `INCLUDE_PATH_LIST=/gardens` ("Paths that contain images you want to resize")
- `IS_ANIMATED=false` we are doubly configuring this in Sharp (`"animated": false`), not sure if that is required
- `SHARP_OPTIONS={"fit":"inside", "animated": false}`
  The option `"fit": "inside"` is now not required anymore since v2.0., but we're keeping it anyway. It shouldn't hurt, and may help in case of future default changes. See:
  - Bug reports: https://github.com/firebase/extensions/issues/1889 & https://github.com/firebase/extensions/issues/2106
  - PR of the fix https://github.com/firebase/extensions/pull/2115

**Behavior clarification:** if you upload a lower resolution image, that image will just be **copied** into the higher-resolution filenames (e.g. \_1920x1080)
without any kind of rescaling. This ensures that the expected version filenames will always be present, but also results in some duplication. I suppose that alternative schemes like listing available versions first, or finding them in Firestore, will be slower.
