import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'new_spot_dialog',
  templateUrl: 'new_spot_dialog.html',
  styleUrls: ['./new_spot_dialog.scss']

})
export class NewSpotDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<NewSpotDialogComponent>,
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
