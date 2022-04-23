import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { ReplaySubject, takeUntil } from 'rxjs';
import { FirebaseService, Marker } from '../services/firebase_service';
import { iconColorMap } from '../services/marker_icon';

@Component({
  selector: 'list-view',
  templateUrl: 'list_view.html',
  styleUrls: ['./list_view.scss'],
})
export class ListViewComponent implements OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef;

  readonly iconColorMap = iconColorMap;
  isSelected = false;

  searchValue = '';
  filteredMarkers: Marker[] = [];

  isFilterCardOpen = false;
  categoryItems: string[] = ['Hike', 'Food', 'Accommodation'];
  selectedCategory = new Set<string>();

  private readonly destroyed = new ReplaySubject<void>(1);

  constructor(readonly firebaseService: FirebaseService) {
    this.filterMarkers();
    this.firebaseService.markersChangeSubject.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.filterMarkers();
    });
    this.firebaseService.drawerOpenSubject
      .pipe(takeUntil(this.destroyed))
      .subscribe((isOpen: boolean) => {
        if (isOpen) {
          this.focusOnSearchBox();
        }
      });
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  focusOnSearchBox() {
    setTimeout(() => {
      this.searchInput.nativeElement.focus();
    }, 0);
  }

  drawerOpen() {
    this.firebaseService.drawerOpenSubject.next(false);
  }

  openSpotInfo(marker: Marker) {
    if (this.firebaseService.selectedSpotId === marker.spotId) {
      this.firebaseService.openSpotInfoDialog(marker);
    }
    this.firebaseService.selectedSpotId = marker.spotId;
    this.firebaseService.panTo({ lat: marker.position.lat, lng: marker.position.lng });
  }

  filterMarkers() {
    // Search input box.
    if (!this.searchValue) {
      this.filteredMarkers = this.firebaseService.markers;
    } else {
      this.filteredMarkers = [];
      const str = this.searchValue.toLowerCase();
      for (let i = 0; i < this.firebaseService.markers.length; ++i) {
        if (this.firebaseService.markers[i].spot.name.toLowerCase().includes(str)) {
          this.filteredMarkers.push(this.firebaseService.markers[i]);
        }
      }
    }

    // Filter panel.
    // Category.
    if (this.selectedCategory.size) {
      // If didn't select any categories, means doesn't apply any filter
      let tempFilteredMarkers: Marker[] = [];
      for (const category of this.selectedCategory) {
        for (let i = 0; i < this.filteredMarkers.length; ++i) {
          if (this.filteredMarkers[i].spot.category === category) {
            tempFilteredMarkers.push(this.filteredMarkers[i]);
          }
        }
      }
      this.filteredMarkers = tempFilteredMarkers;
    }
  }

  openFilterCard() {
    this.isFilterCardOpen = !this.isFilterCardOpen;
    // if (this.isFilterCardOpen) {
    //   this.searchValue = '';
    //   this.filterMarkers();
    // }
  }

  updateSelectedCategory(event: MatCheckboxChange, item: string) {
    if (event.checked) {
      this.selectedCategory.add(item);

      this.filterMarkers();
      return;
    }
    this.selectedCategory.delete(item);
    this.filterMarkers();
  }

  clearFilter() {
    this.selectedCategory.clear();
    this.filterMarkers();
  }
}
