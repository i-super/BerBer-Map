import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NewSpotDialogComponent } from './new_spot_dialog/new_spot_dialog';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(public dialog: MatDialog) {}
  title = 'berbermap';

  openAddNewSpotDialog(): void {
    this.dialog.open(NewSpotDialogComponent);
  }
}
