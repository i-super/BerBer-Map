import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { GoogleMap } from '@angular/google-maps';
import { ReplaySubject, takeUntil } from 'rxjs';
import { FirebaseService } from '../services/firebase_service';
import { mapStyle } from './map_style';
import { MatDialog } from '@angular/material/dialog';
import { SpotInfoDialogComponent } from '../spot_info/spot_info_dialog';

@Component({
  selector: 'map',
  templateUrl: 'map.html',
  styleUrls: ['./map.scss'],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild(GoogleMap) map!: GoogleMap;
  @ViewChild('centerButton', { static: true }) centerButton!: ElementRef;

  readonly mapStyle = mapStyle;

  myLocation?: google.maps.LatLngLiteral;
  readonly myLocationMarkerOptions: google.maps.MarkerOptions = {
    draggable: false,
    icon: {
      path: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
      fillOpacity: 1,
      fillColor: '#07f',
      strokeWeight: 0,
    },
  };

  private watchPosition?: number;

  private readonly destroyed = new ReplaySubject<void>(1);

  constructor(readonly firebaseService: FirebaseService, private readonly matDialog: MatDialog) {
    this.firebaseService.authReady.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.firebaseService.fetchSpots();
    });
  }

  ngAfterViewInit() {
    // Get user's geolocation.
    if (navigator.geolocation) {
      this.watchPosition = navigator.geolocation.watchPosition((position: GeolocationPosition) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (!this.myLocation) {
          this.map.panTo(pos);
        }
        this.myLocation = pos;
      });
    } else {
      // Browser doesn't support Geolocation.
    }

    // Add a center button.
    this.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(
      this.centerButton.nativeElement
    );
  }

  ngOnDestroy() {
    if (this.watchPosition !== undefined) {
      navigator.geolocation?.clearWatch(this.watchPosition);
    }
    this.destroyed.next();
    this.destroyed.complete();
  }

  centerToUserLocation() {
    if (this.myLocation) {
      this.map.panTo(this.myLocation);
    }
  }

  onMarkerClick(marker: any) {
    console.log("Hey~ I'm Mark!", marker);
    this.matDialog.open(SpotInfoDialogComponent, {
      maxHeight: '100vh',
      maxWidth: '100vw',
      data: marker,
      autoFocus: false,
    });
  }
}
