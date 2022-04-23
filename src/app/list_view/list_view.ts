import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
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

  private readonly destroyed = new ReplaySubject<void>(1);

  constructor(readonly firebaseService: FirebaseService) {
    this.filterMarkers();
    this.firebaseService.markersChangeSubject.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.filterMarkers();
    });
    this.firebaseService.drawerOpenedChangeSubject
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

  openSpotInfo(marker: Marker) {
    if (this.firebaseService.selectedSpotId === marker.spotId) {
      this.firebaseService.openSpotInfoDialog(marker);
    }
    this.firebaseService.selectedSpotId = marker.spotId;
    this.firebaseService.panTo({ lat: marker.position.lat, lng: marker.position.lng });
  }

  filterMarkers() {
    if (!this.searchValue) {
      this.filteredMarkers = this.firebaseService.markers;
      return;
    }
    this.filteredMarkers = [];
    const str = this.searchValue.toLowerCase();
    for (let i = 0; i < this.firebaseService.markers.length; ++i) {
      if (this.firebaseService.markers[i].spot.name.toLowerCase().includes(str)) {
        this.filteredMarkers.push(this.firebaseService.markers[i]);
      }
    }
  }

  openFilterCard() {
    this.isFilterCardOpen = !this.isFilterCardOpen;
    if (this.isFilterCardOpen) {
      this.searchValue = '';
      this.filterMarkers();
    }
  }
}
