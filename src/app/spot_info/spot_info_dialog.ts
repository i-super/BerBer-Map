import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Marker } from '../services/firebase_service';
import { iconColorMap } from '../services/marker_icon';
import { Gallery, ImageItem } from 'ng-gallery';
import { Lightbox } from 'ng-gallery/lightbox';

@Component({
  selector: 'spot-info-dialog',
  templateUrl: 'spot_info_dialog.html',
  styleUrls: ['./spot_info_dialog.scss'],
})
export class SpotInfoDialogComponent implements OnInit {
  readonly iconColorMap = iconColorMap;

  items: any;

  currentImageIndex = 0;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Marker, public gallery: Gallery) {
    // Map the data to gallery image items
    this.items = this.data.spot.images.map((item) => new ImageItem({ src: item, thumb: item }));

    console.log('data:', data);
  }

  ngOnInit() {
    // Load items into gallery
    this.gallery.ref().load(this.items);
  }

  swipeImage(newIndex: number) {
    if (newIndex < 0 || newIndex >= this.data.spot.images.length) {
      return;
    }
    this.currentImageIndex = newIndex;
  }
}
