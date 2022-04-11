import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Marker } from '../services/firebase_service';
import { iconColorMap } from '../services/marker_icon';

@Component({
  selector: 'spot-info-dialog',
  templateUrl: 'spot_info_dialog.html',
  styleUrls: ['./spot_info_dialog.scss'],
})
export class SpotInfoDialogComponent {
  readonly iconColorMap = iconColorMap;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Marker) {
    console.log('data:', data);
  }
}
