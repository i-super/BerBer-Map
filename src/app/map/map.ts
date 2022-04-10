import { Component, OnDestroy, ViewChild } from '@angular/core';
import { GoogleMap } from '@angular/google-maps';
import { ReplaySubject, takeUntil } from 'rxjs';
import { FirebaseService } from '../services/firebase_service';

@Component({
  selector: 'map',
  templateUrl: 'map.html',
  styleUrls: ['./map.scss'],
})
export class MapComponent implements OnDestroy {
  @ViewChild(GoogleMap) map!: GoogleMap;

  private readonly destroyed = new ReplaySubject<void>(1);

  constructor(readonly firebaseService: FirebaseService) {
    this.firebaseService.authReady.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.firebaseService.fetchSpots();
    });
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  onMarkerClick(marker: any) {
    console.log("Hey~ I'm Mark!", marker);
  }
}
