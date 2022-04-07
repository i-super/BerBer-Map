import { Component, ViewChild } from '@angular/core';
import { GoogleMap } from '@angular/google-maps';
import { MatDialog } from '@angular/material/dialog';
import { NewSpotDialogComponent } from './new_spot_dialog/new_spot_dialog';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  @ViewChild(GoogleMap) map!: GoogleMap;

  constructor(public dialog: MatDialog) {}
  title = 'berbermap';

  openAddNewSpotDialog(): void {
    this.dialog.open(NewSpotDialogComponent);
  }
}
