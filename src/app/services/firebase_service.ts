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
  getDoc,
  DocumentSnapshot,
  arrayRemove,
  query,
  where,
} from 'firebase/firestore';
import { DocumentReference } from 'firebase/firestore/lite';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { BehaviorSubject, Subject } from 'rxjs';

import { auth, db } from '../firebase';
import { iconColorMap } from './marker_icon';
import { SpotInfoDialogComponent } from '../spot_info/spot_info_dialog';
import { MatDialog } from '@angular/material/dialog';

interface CreateSpotParams {
  editingSpotId?: string;
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  icon: string;
  tags: string[];
  notes: string;
  images: { file?: File; storedImage?: SpotImage }[];
}

export interface SpotDB {
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
  images: SpotImage[];
}

export interface SpotImage {
  url: string;
  storagePath: string;
}

interface TagDB {
  spots: string[];
}

export interface Marker {
  position: google.maps.LatLngLiteral;
  color: string;
  spotId: string;
  spot: SpotDB;
}

export interface Pos {
  lat: number;
  lng: number;
}

@Injectable({ providedIn: 'root' })
export class FirebaseService implements OnDestroy {
  // https://firebase.google.com/docs/reference/js/firebase.User
  currentUser: User | null = null;

  readonly authReady = new Subject<void>();
  readonly panToSubject = new Subject<Pos>();
  readonly drawerOpenSubject = new BehaviorSubject<boolean>(false);

  selectedSpotId?: string;
  markers: Marker[] = [];

  filteredMarkers: Marker[] = [];
  filterText = '';
  filterCategory = new Set<string>();

  constructor(private readonly matDialog: MatDialog) {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.authReady.next();
    });
  }

  ngOnDestroy() {
    this.authReady.complete();
    this.panToSubject.complete();
  }

  async fetchSpots() {
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
      this.markers.push({
        position: { lat: spot.lat, lng: spot.lng },
        color: iconColorMap[spot.icon],
        spotId: doc.id,
        spot,
      });
    });
    this.filterMarkers();
  }

  async createOrEditSpot({
    editingSpotId,
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
      throw new Error('Cannot createOrEditSpot without logged in user.');
    }
    const uid = this.currentUser.uid;
    const timestamp = new Date();
    const userRef = doc(db, 'users', uid);
    const userSpotsCollection = collection(userRef, 'spots') as CollectionReference<SpotDB>;

    let spotId: string;
    let spotRef: DocumentReference<SpotDB>;
    let existingSpotData: SpotDB | undefined;
    if (editingSpotId) {
      // Editing an existing spot.
      spotId = editingSpotId;
      spotRef = doc(userRef, 'spots', spotId) as DocumentReference<SpotDB>;
      const existingSpotSnapshot = (await getDoc(spotRef)) as DocumentSnapshot<SpotDB>;
      if (!existingSpotSnapshot.exists()) {
        throw new Error(`Editing spot but the spot data does not exist. Spot id: ${spotId}`);
      }
      existingSpotData = existingSpotSnapshot.data();
    } else {
      // Creating a new spot.
      spotRef = doc<SpotDB>(userSpotsCollection);
      spotId = spotRef.id;
    }

    // Check if the placeId already exist, we do not allow duplicated placeIds.
    // Only need to check if we're in create mode,
    // or if the user is changing placeId in edit mode.
    if (!editingSpotId || existingSpotData?.placeId !== placeId) {
      const q = query(userSpotsCollection, where('placeId', '==', placeId));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.docs.some((doc) => doc.id !== spotId)) {
        throw new Error(`The place ID ${placeId} already exist.`);
      }
    }

    // Write to /checkpoints/<uid>/createOrEditSpot/<checkpointId>/<checkpointData>
    // before uploading images, and we'll remove the checkpoint when writing to
    // firestore, so we know if things fail half way.
    const checkpointCollection = collection(db, 'checkpoints', uid, 'createOrEditSpot');
    const checkpointData: { [key: string]: string | Date } = {
      spotId,
      placeId,
      timestamp,
    };
    if (editingSpotId && existingSpotData) {
      checkpointData['editingSpotId'] = editingSpotId;
      checkpointData['oldPlaceId'] = existingSpotData.placeId;
    }
    const checkpoint = await addDoc(checkpointCollection, checkpointData);

    // Remove `existingSpotData.images` that are no longer in `images` from Storage.
    const storage = getStorage();
    const removeImagePromises: Promise<void>[] = [];
    if (existingSpotData) {
      for (const oldImage of existingSpotData.images) {
        if (!images.find((image) => image.storedImage?.storagePath === oldImage.storagePath)) {
          // Remove oldImage.
          const storageRef = ref(storage, oldImage.storagePath);
          const promise = deleteObject(storageRef).catch((error) => {
            if (`${error}`.includes('(storage/object-not-found)')) {
              // This image is already deleted, no need to throw.
              return;
            } else {
              // Otherwise throw.
              throw error;
            }
          });
          removeImagePromises.push(promise);
        }
      }
    }
    // Store new images to Firebase Storage.
    const uploadImagePromises: Promise<void>[] = [];
    const imageIds = new Set<string>();
    if (existingSpotData) {
      // To avoid conflict image name, seed the set with existing image names.
      for (const image of existingSpotData.images) {
        const parts = image.storagePath.split('/');
        const fileName = parts[parts.length - 1];
        const png = '.png';
        if (fileName && fileName.endsWith(png)) {
          imageIds.add(fileName.substring(0, fileName.length - png.length));
        }
      }
    }
    // Upload new images.
    for (const image of images) {
      if (!image.file) continue;
      let imageId = `${Math.floor(Math.random() * 10000000)}`;
      while (imageIds.has(imageId)) {
        imageId = `${Math.floor(Math.random() * 10000000)}`;
      }
      // Upload images to storage at /users/<uid>/spots/<spotId>/<imageId>.png
      const storagePath = `/users/${uid}/spots/${placeId}/${imageId}.png`;
      const storageRef = ref(storage, storagePath);
      const promise = uploadBytes(storageRef, image.file)
        .then((uploadResult) => getDownloadURL(uploadResult.ref))
        .then((url) => {
          // After done uploading, update the images array with the storedImage.
          image.storedImage = { url, storagePath };
        });
      uploadImagePromises.push(promise);
    }

    // Wait for all Storage operations to finish before updating Firestore.
    await Promise.all([...removeImagePromises, ...uploadImagePromises]);

    // Check that all the images have storedImage field set.
    if (images.some((image) => !image.storedImage)) {
      console.error(images);
      throw new Error(
        'Storage (remove or upload images) done, but some image in images array still have empty storedImage field.'
      );
    }
    // We need to write spots, tags, etc. in "batch" atomically.
    const batch = writeBatch(db);
    // Spot data.
    const spotDocToWrite: Partial<SpotDB> = {
      placeId,
      updatedAt: timestamp,
      name,
      lat,
      lng,
      category,
      icon,
      tags,
      notes,
      images: images
        .map((image) => image.storedImage)
        .filter((image): image is SpotImage => !!image),
    };
    if (!existingSpotData) {
      spotDocToWrite.createdAt = timestamp;
    }
    batch.set(spotRef, spotDocToWrite, { merge: true });
    // Tags to add.
    for (const tag of tags) {
      const tagsRef = doc(userRef, 'tags', tag) as DocumentReference<TagDB>;
      batch.set(tagsRef, { spots: arrayUnion(spotId) }, { merge: true });
    }
    if (existingSpotData) {
      // Tags to remove.
      const tagsSet = new Set<string>(tags);
      for (const tag of existingSpotData.tags) {
        if (!tagsSet.has(tag)) {
          const tagsRef = doc(userRef, 'tags', tag) as DocumentReference<TagDB>;
          batch.set(tagsRef, { spots: arrayRemove(spotId) }, { merge: true });
        }
      }
    }

    // Also remove the checkpoint as part of this batch write.
    batch.delete(doc(checkpointCollection, checkpoint.id));
    // Finally commit the batch.
    await batch.commit();
  }

  async deleteSpot(spotId: string) {
    if (!this.currentUser) {
      throw new Error('Cannot deleteSpot without logged in user.');
    }
    const uid = this.currentUser.uid;

    // Get the list of images.
    const userRef = doc(db, 'users', uid);
    const spotRef = doc(userRef, 'spots', spotId) as DocumentReference<SpotDB>;
    const spotSnapshot = (await getDoc(spotRef)) as DocumentSnapshot<SpotDB>;
    if (!spotSnapshot.exists()) {
      throw new Error(`The spot ID ${spotId} you are trying to delete does not exist`);
    }
    const spotDoc = spotSnapshot.data();

    // Remove images in Firebase Storage first.
    const storage = getStorage();
    const promises: Promise<void>[] = [];
    for (const image of spotDoc.images) {
      const storageRef = ref(storage, image.storagePath);
      const promise = deleteObject(storageRef).catch((error) => {
        if (`${error}`.includes('(storage/object-not-found)')) {
          // This image is already deleted, no need to throw.
          return;
        } else {
          // Otherwise throw.
          throw error;
        }
      });
      promises.push(promise);
    }

    // We need to write spots, tags, etc. in "batch" atomically.
    const batch = writeBatch(db);
    return Promise.all(promises).then(() => {
      // Spot data.
      batch.delete(spotRef);
      // Tags data.
      for (const tag of spotDoc.tags) {
        const tagsRef = doc(userRef, 'tags', tag) as DocumentReference<TagDB>;
        batch.set(tagsRef, { spots: arrayRemove(spotId) }, { merge: true });
      }

      return batch.commit();
    });
  }

  openSpotInfoDialog(marker: Marker) {
    this.matDialog.open(SpotInfoDialogComponent, {
      maxHeight: '100vh',
      maxWidth: '100vw',
      data: marker,
      autoFocus: false,
    });
    this.selectedSpotId = marker.spotId;
  }

  panTo(pos: Pos) {
    this.panToSubject.next(pos);
  }

  updateFilterCategory(category: string, checked: boolean) {
    if (checked) {
      this.filterCategory.add(category);
    } else {
      this.filterCategory.delete(category);
    }
    this.filterMarkers();
  }

  filterMarkers() {
    // Search input box.
    if (!this.filterText) {
      this.filteredMarkers = this.markers;
    } else {
      this.filteredMarkers = [];
      const str = this.filterText.toLowerCase();
      for (let i = 0; i < this.markers.length; ++i) {
        // ber
        if (this.markers[i].spot.name.toLowerCase().includes(str)) {
          this.filteredMarkers.push(this.markers[i]);
        }
      }
    }

    // Filter panel.
    // Category.
    if (this.filterCategory.size) {
      // If didn't select any categories, means doesn't apply any filter
      let tempFilteredMarkers: Marker[] = [];
      for (const category of this.filterCategory) {
        for (let i = 0; i < this.filteredMarkers.length; ++i) {
          if (this.filteredMarkers[i].spot.category === category) {
            tempFilteredMarkers.push(this.filteredMarkers[i]);
          }
        }
      }
      this.filteredMarkers = tempFilteredMarkers;
    }
  }

  clearFilter() {
    this.filterCategory.clear();
    this.filterMarkers();
  }
}
