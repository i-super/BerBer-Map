import { Injectable, OnDestroy } from '@angular/core';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  arrayUnion,
  writeBatch,
  doc,
  collection,
  getDocs,
  CollectionReference,
  addDoc,
} from 'firebase/firestore';
import { DocumentReference } from 'firebase/firestore/lite';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Subject } from 'rxjs';

import { auth, db } from '../firebase';
import { iconColorMap } from './marker_icon';

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

interface Marker {
  position: google.maps.LatLngLiteral;
  options: google.maps.MarkerOptions;
  spot: SpotDB;
}

@Injectable({ providedIn: 'root' })
export class FirebaseService implements OnDestroy {
  // https://firebase.google.com/docs/reference/js/firebase.User
  currentUser: User | null = null;

  readonly authReady = new Subject<void>();

  spots: SpotDB[] = [];
  markers: Marker[] = [];

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.authReady.next();
    });
  }

  ngOnDestroy() {
    this.authReady.complete();
  }

  async fetchSpots() {
    this.spots = [];
    this.markers = [];
    if (!this.currentUser) {
      return;
    }
    const uid = this.currentUser.uid;
    const userRef = doc(db, 'users', uid);

    const spotsCollection = collection(userRef, 'spots') as CollectionReference<SpotDB>;
    const querySnapshot = await getDocs(spotsCollection);

    querySnapshot.forEach((doc) => {
      const spot = doc.data();
      let fillColor = '';
      this.spots.push(spot);
      fillColor = iconColorMap[spot.icon];
      this.markers.push({
        position: { lat: spot.lat, lng: spot.lng },
        options: {
          draggable: false,
          icon: {
            // https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel
            path: 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z',
            anchor: new google.maps.Point(12, 17),
            fillOpacity: 1,
            fillColor,
            strokeWeight: 2,
            strokeColor: 'white',
            scale: 2,
            labelOrigin: new google.maps.Point(12, 15),
          },
        },
        spot,
      });
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
    // Write to /checkpoints/<uid>/createSpot/<checkpointId>/<checkpointData>
    // before uploading images, and we'll remove the checkpoint when writing to
    // firestore, so we know if things fail half way.
    const checkpointCollection = collection(db, 'checkpoints', uid, 'createSpot');
    const checkpoint = await addDoc(checkpointCollection, {
      placeId,
      timestamp,
    });

    // Store images to Firebase Storage.
    const storage = getStorage();
    const promises: Array<Promise<string>> = [];
    const imageIds = new Set<string>();
    for (const image of images) {
      let imageId = `${Math.floor(Math.random() * 10000000)}`;
      while (imageIds.has(imageId)) {
        imageId = `${Math.floor(Math.random() * 10000000)}`;
      }
      // Upload images to storage at /users/<uid>/spots/<spotId>/<imageId>.png
      const storagePath = `/users/${uid}/spots/${placeId}/${imageId}.png`;
      const storageRef = ref(storage, storagePath);
      const promise = uploadBytes(storageRef, image).then((uploadResult) => {
        return getDownloadURL(uploadResult.ref);
      });
      promises.push(promise);
    }

    // We need to write spots, tags, etc. in "batch" atomically.
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', uid);
    const spotRef = doc(userRef, 'spots', placeId) as DocumentReference<SpotDB>;
    return Promise.all(promises).then((uploadedImages) => {
      // Spot data.
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
      // Tags data.
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
      // Also remove the checkpoint as part of this batch write.
      batch.delete(doc(checkpointCollection, checkpoint.id));

      return batch.commit();
    });
  }
}
