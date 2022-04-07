import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

interface Mark {
  label: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'new-spot-dialog',
  templateUrl: 'new_spot_dialog.html',
  styleUrls: ['./new_spot_dialog.scss'],
})
export class NewSpotDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('spotInput') spotInput!: ElementRef;

  placesAutocomplete!: google.maps.places.Autocomplete;
  spotLocation?: google.maps.places.PlaceResult;

  selectedCategory = '';
  categories = ['Hike', 'Food'];
  selectedIcon: Mark = { label: '', icon: '', color: '' };
  icons = [
    { label: 'Awesome', icon: 'favorite', color: '#ff616f' },
    { label: 'Good', icon: 'check_circle', color: '#4caf50' },
    { label: 'Naah', icon: 'thumb_down', color: '#0091ea' },
  ];
  tags: string[] = [];
  notes = '';
  // images: [];

  constructor(public dialogRef: MatDialogRef<NewSpotDialogComponent>) {}

  ngAfterViewInit() {
    this.placesAutocomplete = new google.maps.places.Autocomplete(
      this.spotInput.nativeElement,
      {
        fields: ['place_id', 'geometry', 'icon', 'name'],
      }
    );
    this.placesAutocomplete.addListener('place_changed', () => {
      const place = this.placesAutocomplete.getPlace();
      console.log(place);
      if (place.geometry) {
        this.spotLocation = place;
      } else {
        this.spotLocation = undefined;
      }
    });
  }

  ngOnDestroy() {
    google.maps.event.clearInstanceListeners(this.placesAutocomplete);
  }

  onSave(): void {
    console.log(
      'spotLocation:',
      this.spotLocation,
      ', selectedCategory:',
      this.selectedCategory,
      ', selectedIcon:',
      this.selectedIcon,
      ', tags:',
      this.tags,
      ', notes:',
      this.notes
    );
  }
}
