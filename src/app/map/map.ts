import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { GoogleMap } from '@angular/google-maps';
import { ReplaySubject, takeUntil } from 'rxjs';
import { FirebaseService } from '../services/firebase_service';
import { mapStyle } from './map_style';

@Component({
  selector: 'map',
  templateUrl: 'map.html',
  styleUrls: ['./map.scss'],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild(GoogleMap) map!: GoogleMap;

  readonly mapStyle = mapStyle;

  private readonly destroyed = new ReplaySubject<void>(1);

  constructor(readonly firebaseService: FirebaseService) {
    this.firebaseService.authReady.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.firebaseService.fetchSpots();
    });
  }

  ngAfterViewInit() {
    // Get user's geolocation.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.map.panTo(pos);
      });
    } else {
      // Browser doesn't support Geolocation
    }
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  onMarkerClick(marker: any) {
    console.log("Hey~ I'm Mark!", marker);
  }
}
