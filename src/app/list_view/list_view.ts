import { Component } from '@angular/core';
import { FirebaseService, Marker } from '../services/firebase_service';
import { iconColorMap } from '../services/marker_icon';

@Component({
  selector: 'list-view',
  templateUrl: 'list_view.html',
  styleUrls: ['./list_view.scss'],
})
export class ListViewComponent {
  readonly iconColorMap = iconColorMap;
  isSelected = false;

  constructor(readonly firebaseService: FirebaseService) {}

  openSpotInfo(marker: Marker) {
    if (this.firebaseService.selectedSpotId === marker.spotId) {
      this.firebaseService.openSpotInfoDialog(marker);
    }
    this.firebaseService.selectedSpotId = marker.spotId;
    this.firebaseService.panTo({ lat: marker.position.lat, lng: marker.position.lng });
  }
}
