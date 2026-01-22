import { deleteObject, getDownloadURL, ref, uploadString } from 'firebase/storage';
import { db, storage } from './firebase';
import { getUser } from '$lib/stores/auth';
import type GeoJSON from 'geojson';
import {
  type CollectionReference,
  type DocumentReference,
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
  findFileDataLayer,
  findFileDataLayerByMD5Hash,
  removeFileDataLayers,
  updateFileDataLayers
} from '$lib/stores/file';
import logger from '$lib/util/logger';

const getFileRef = (fileId: string) => ref(storage(), `trails/${getUser().uid}/${fileId}`);

export const createTrailObserver = () => {
  const q = query(
    collection(db(), USERS_PRIVATE, getUser().id, TRAILS) as CollectionReference<FirebaseTrail>
  );

  return onSnapshot(q, async (querySnapshot) => {
    const changes = querySnapshot.docChanges();
    changes.map(async (change) => {
      const trail: LocalTrail = {
        id: change.doc.id,
        animate: false,
        ...change.doc.data()
      };
      if (change.type === 'added') {
        const existingLocalLayer = findFileDataLayer(trail.id);
        if (!existingLocalLayer) {
          // Sync a *remote* addition to the local cache
          // Locally added files are added before they are uploaded (see `createTrail()`).
          //
          // Download the trail file
          const ref = getFileRef(trail.id);
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
        const existingLocalLayer = findFileDataLayer(trail.id);
        if (existingLocalLayer) {
          removeFileDataLayers(trail.id);
        }
      } else if (change.type === 'modified') {
        // For now, only the visiblity can be modified
        updateFileDataLayers(trail.id, trail);
      }
    });
  });
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

  // Immediately show the file locally
  addFileDataLayers({
    id: docRef.id,
    originalFileName: name,
    geoJson,
    md5Hash,
    visible: true,
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
    visible: true
  });
};

export const toggleTrailVisibility = async (id: string) => {
  const existingFile = findFileDataLayer(id);
  if (!existingFile) {
    logger.error('The visibility of this trail can not be changed');
    return;
  }
  const ref = doc(db(), USERS_PRIVATE, getUser().id, TRAILS, id);
  await updateDoc(ref, { visible: !existingFile.visible });
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
