import { deleteObject, getDownloadURL, ref, uploadString } from 'firebase/storage';
import { db, storage } from './firebase';
import { getUser } from '$lib/stores/auth';
import type GeoJSON from 'geojson';
import {
  type CollectionReference,
  type DocumentReference,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { TRAILS, USERS_PRIVATE } from './collections';
import type { FirebaseTrail, LocalTrail } from '$lib/types/Trail';
import md5 from 'md5';
import {
  addFileDataLayers,
  fileDataLayers,
  findFileDataLayer,
  findFileDataLayerByMD5Hash,
  removeFileDataLayers,
  updateFileDataLayers
} from '$lib/stores/file';
import logger from '$lib/util/logger';

const getFileRef = (fileId: string) => ref(storage(), `trails/${getUser().uid}/${fileId}`);

/**
 * The visibility we last saw persisted in Firestore, per trail id. The snapshot listener in
 * {@link createTrailObserver} writes this from every remote add/modify; the local-change
 * reaction there compares each layer's `visible` against it to tell a genuine user toggle from
 * an echo of our own write bouncing back through the listener. Reset when the observer is torn
 * down.
 */
const persistedVisibility = new Map<string, boolean>();

/** Persists a trail's visibility to Firestore (set, not toggle — idempotent). */
const setTrailVisibility = (id: string, visible: boolean) => {
  const ref = doc(db(), USERS_PRIVATE, getUser().id, TRAILS, id);
  return updateDoc(ref, { visible });
};

export const createTrailObserver = () => {
  const q = query(
    collection(db(), USERS_PRIVATE, getUser().id, TRAILS) as CollectionReference<FirebaseTrail>
  );

  const unsubscribeSnapshot = onSnapshot(q, async (querySnapshot) => {
    const changes = querySnapshot.docChanges();
    await Promise.allSettled(
      changes.map(async (change) => {
        const trail: LocalTrail = {
          id: change.doc.id,
          animate: false,
          ...change.doc.data()
        };
        if (change.type === 'added') {
          // Record the persisted visibility so the local-change reaction below won't mistake
          // this remote value for a user toggle and re-persist it.
          persistedVisibility.set(trail.id, trail.visible);
          const existingLocalLayer = findFileDataLayer(trail.id);
          if (!existingLocalLayer) {
            // Sync a *remote* addition to the local cache
            // Locally added files are added before they are uploaded (see `createTrail()`).
            //
            // Download the trail file
            const ref = getFileRef(trail.id);
            // Note: after some time on of inactivity, getDownloadURL
            // seems to hang on the dev server; and needs a restart.
            const geoJson = await getDownloadURL(ref)
              .then((url) => fetch(url))
              .then((r) => r.json());
            addFileDataLayers({
              ...trail,
              geoJson
            });
          }
        } else if (change.type === 'removed') {
          // Sync the deletion to the local cache
          persistedVisibility.delete(trail.id);
          const existingLocalLayer = findFileDataLayer(trail.id);
          if (existingLocalLayer) {
            removeFileDataLayers(trail.id);
          }
        } else if (change.type === 'modified') {
          // Modified here or elsewhere.
          persistedVisibility.set(trail.id, trail.visible);
          const existingLocalLayer = findFileDataLayer(trail.id);
          // Only update the local layer visibility if it changed
          if (existingLocalLayer && existingLocalLayer.visible !== trail.visible) {
            updateFileDataLayers(trail.id, trail);
          }
        }
      })
    );
  });

  // Optimistic-UI persistence for trail visibility in Firebase.
  // This code does orchestrates the mutations in Firebase documents (setTrailVisibility)
  // `bind:checked` in TrailsTool mutates a layer's `visible` and
  // pushes it into fileDataLayers; here we diff every layer against the last value we saw in
  // Firestore and write through only the ones the user actually changed (not sync-backs from Firebase)
  const unsubscribeLocalChanges = fileDataLayers.subscribe((layers) => {
    layers.forEach((layer) => {
      const persisted = persistedVisibility.get(layer.id);
      // Skip trails not yet confirmed in Firestore (e.g. one just uploaded, whose `added`
      // snapshot hasn't arrived): createTrail() already persists their initial visibility.
      if (persisted === undefined || layer.visible === persisted) return;
      persistedVisibility.set(layer.id, layer.visible);
      setTrailVisibility(layer.id, layer.visible).catch((error) => {
        logger.error(error);
        // The write failed: roll the optimistic local state (and the baseline) back.
        persistedVisibility.set(layer.id, persisted);
        updateFileDataLayers(layer.id, { visible: persisted });
      });
    });
  });

  return () => {
    unsubscribeSnapshot();
    unsubscribeLocalChanges();
    persistedVisibility.clear();
  };
};

export const createTrail = async ({
  /**
   * Original file name
   */
  name,
  geoJson
}: {
  name: string;
  geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature;
}) => {
  const uid = getUser().id;

  // Calculate the file's MD5 checksum
  const jsonString = JSON.stringify(geoJson);
  const md5Hash = md5(jsonString);

  // Check if the file already exists
  const existingFile = findFileDataLayerByMD5Hash(md5Hash);
  if (existingFile) {
    logger.error('This file already exists');
    return;
  }

  // First, create a local Firestore doc reference explicitly, so it's ID can be used
  const docRef = doc(
    collection(db(), USERS_PRIVATE, uid, TRAILS)
  ) as DocumentReference<FirebaseTrail>;

  // Timestamp used to order trails (earliest first) consistently across reloads.
  const createdAt = Timestamp.now();

  // Immediately show the file locally
  addFileDataLayers({
    id: docRef.id,
    originalFileName: name,
    geoJson,
    md5Hash,
    visible: true,
    createdAt,
    animate: true
  });

  // Next, upload the file for persistence
  const fileRef = getFileRef(docRef.id);
  await uploadString(fileRef, jsonString, undefined, {
    // TODO: should we rename extensions to .geojson?
    contentType: 'application/geo+json',
    customMetadata: {
      originalFileName: name
    }
  });

  // Set the remote document content
  await setDoc(docRef, {
    originalFileName: name,
    // Default
    md5Hash,
    visible: true,
    createdAt
  });
};

export const deleteTrail = async (id: string) => {
  const existingFile = findFileDataLayer(id);
  if (!existingFile) {
    logger.error('This trail does not exist');
    return;
  }

  const ref = getFileRef(id);
  // Delete the storage object
  await deleteObject(ref);
  // Delete the metadata
  await deleteDoc(doc(db(), USERS_PRIVATE, getUser().id, TRAILS, id));
};
