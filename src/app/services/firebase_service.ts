import { Injectable } from '@angular/core';
import { onAuthStateChanged, User } from 'firebase/auth';
import { arrayUnion, writeBatch, doc } from 'firebase/firestore';
import { DocumentReference } from 'firebase/firestore/lite';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

import { auth, db } from '../firebase';

interface CreateSpotParams {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  icon: string;
  tags: string[];
  notes: string;
  images: File[];
}

interface SpotDB {
  placeId: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  lat: number;
  lng: number;
  category: string;
  icon: string;
  tags: string[];
  notes: string;
  images: string[];
}

interface TagDB {
  spots: string[];
}

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  // https://firebase.google.com/docs/reference/js/firebase.User
  currentUser: User | null = null;

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
  }

  async createSpot({
    placeId,
    name,
    lat,
    lng,
    category,
    icon,
    tags,
    notes,
    images,
  }: CreateSpotParams) {
    if (!this.currentUser) {
      throw new Error('Cannot createSpot without logged in user.');
    }
    const uid = this.currentUser.uid;

    const timestamp = new Date();
    const storage = getStorage();

    // We need to write spots, tags, etc. in "batch" atomically.
    const batch = writeBatch(db);

    const userRef = doc(db, 'users', uid);

    // Generate new ref id for the new spot.
    const spotRef = doc(userRef, 'spots', placeId) as DocumentReference<SpotDB>;

    const promises: Array<Promise<string>> = [];
    const imageIds = new Set<string>();
    for (const image of images) {
      // Upload images to storage at /users/<uid>/spots/<spotId>/images/<imageId>.png
      let imageId = `${Math.floor(Math.random() * 10000000)}`;
      while (imageIds.has(imageId)) {
        imageId = `${Math.floor(Math.random() * 10000000)}`;
      }
      const storagePath = `/users/${uid}/spots/${imageId}.png`;
      const storageRef = ref(storage, storagePath);
      const promise = uploadBytes(storageRef, image).then((uploadResult) => {
        return getDownloadURL(uploadResult.ref);
      });
      promises.push(promise);
    }
    return Promise.all(promises).then((uploadedImages) => {
      batch.set(
        spotRef,
        {
          placeId,
          createdAt: timestamp,
          updatedAt: timestamp,
          name,
          lat,
          lng,
          category,
          icon,
          tags,
          notes,
          images: uploadedImages,
        },
        { merge: true }
      );

      for (const tag of tags) {
        const tagsRef = doc(userRef, 'tags', tag) as DocumentReference<TagDB>;
        batch.set(
          tagsRef,
          {
            spots: arrayUnion(placeId),
          },
          { merge: true }
        );
      }

      return batch.commit();
    });
  }
}
