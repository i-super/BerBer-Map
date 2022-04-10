import { Component, ViewChild } from '@angular/core';
import { GoogleMap } from '@angular/google-maps';
import { FirebaseService } from '../services/firebase_service';

@Component({
  selector: 'map',
  templateUrl: 'map.html',
  styleUrls: ['./map.scss'],
})
export class MapComponent {
  @ViewChild(GoogleMap) map!: GoogleMap;

  constructor(readonly firebaseService: FirebaseService) {
    this.firebaseService.authReady.subscribe(() => {
      if (this.firebaseService.currentUser) {
        this.firebaseService.fetchSpots();
      }
    });
  }

  onMarkerClick(marker: any) {
    console.log("Hey~ I'm Mark!", marker);
  }
}
