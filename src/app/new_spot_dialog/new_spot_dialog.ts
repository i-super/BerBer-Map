import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { resizeImg } from '../image_processing';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { FirebaseService } from '../services/firebase_service';

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
  @ViewChild('tagInput', { read: MatAutocompleteTrigger })
  tagInput!: MatAutocompleteTrigger;

  placesAutocomplete!: google.maps.places.Autocomplete;
  spotLocation?: google.maps.places.PlaceResult;
  name = '';

  selectedCategory?: string;
  categories = ['Hike', 'Food'];
  selectedIcon?: Mark;
  icons = [
    { label: 'Awesome', icon: 'favorite', color: '#ff616f' },
    { label: 'Good', icon: 'check_circle', color: '#4caf50' },
    { label: 'Naah', icon: 'thumb_down', color: '#0091ea' },
  ];
  tags: Set<string> = new Set<string>();
  tagValue = '';
  tagOptions = [
    'shade',
    'easy',
    'moderate',
    'difficult',
    'landscape',
    'toilet',
    'picnic',
  ];
  filteredTagOptions: string[] = [];
  notes = '';
  uploadImages: { previewURL: SafeUrl; file: File }[] = [];

  loading = false;

  constructor(
    private readonly domSanitizer: DomSanitizer,
    private readonly firebaseService: FirebaseService,
    private readonly matDialogRef: MatDialogRef<NewSpotDialogComponent>,
    private readonly matSnackBar: MatSnackBar
  ) {
    this.filterTags();
  }

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
        this.name = place.name ?? '';
      } else {
        this.spotLocation = undefined;
      }
    });
  }

  ngOnDestroy() {
    google.maps.event.clearInstanceListeners(this.placesAutocomplete);
  }

  filterTags() {
    const keyword = this.tagValue.trim().toLowerCase();
    const removeDupOpt = [];
    for (const tag of this.tagOptions) {
      if (!this.tags.has(tag)) {
        removeDupOpt.push(tag);
      }
    }
    if (!keyword) {
      this.filteredTagOptions = removeDupOpt;
    } else {
      // this.filteredTagOptions = [
      //   this.tagValue,
      //   ...this.tagOptions.filter((tag) => tag.toLowerCase().includes(keyword)),
      // ];
      let hasTagValue = false;
      this.filteredTagOptions = [];
      for (const tag of removeDupOpt) {
        if (tag.toLowerCase().includes(keyword)) {
          this.filteredTagOptions.push(tag);
          if (tag === this.tagValue) {
            hasTagValue = true;
          }
        }
      }
      if (!hasTagValue) {
        this.filteredTagOptions.unshift(this.tagValue);
      }
    }
  }

  addTag(tagValue: string) {
    if (!tagValue) return;

    this.tags.add(tagValue);
    setTimeout(() => {
      this.tagValue = '';
      this.tagInput.openPanel();
    });
  }

  onSelectImg(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (!files) return;
    for (let i = 0; i < files.length; ++i) {
      resizeImg(files[i], 'image.png', 800, 800)
        .then(({ file }) => {
          this.uploadImages.push({
            file,
            previewURL: this.domSanitizer.bypassSecurityTrustUrl(
              URL.createObjectURL(file)
            ),
          });
        })
        .catch((error) => {
          // TODO: color too dark
          this.matSnackBar.open(error.message, 'Dismiss');
        });
    }
  }

  onSave(): void {
    if (
      this.loading ||
      !this.spotLocation?.geometry?.location ||
      !this.spotLocation?.place_id ||
      !this.selectedCategory ||
      !this.selectedIcon ||
      !this.name
    ) {
      return;
    }

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
      this.notes,
      ' uploadImages:',
      this.uploadImages
    );

    this.loading = true;

    this.firebaseService
      .createSpot({
        placeId: this.spotLocation.place_id,
        name: this.name,
        lat: this.spotLocation.geometry.location.lat(),
        lng: this.spotLocation.geometry.location.lng(),
        category: this.selectedCategory,
        icon: this.selectedIcon.icon,
        tags: [...this.tags],
        notes: this.notes,
        images: this.uploadImages.map((image) => image.file),
      })
      .then(() => {
        this.matDialogRef.close();
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        this.loading = false;
      });
  }
}
