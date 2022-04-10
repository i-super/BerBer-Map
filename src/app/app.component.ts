import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthDialog } from './auth_dialog/auth_dialog';
import { auth } from './firebase';
import { NewSpotDialogComponent } from './new_spot_dialog/new_spot_dialog';
import { FirebaseService } from './services/firebase_service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly auth = auth;

  constructor(readonly firebaseService: FirebaseService, private readonly matDialog: MatDialog) {}

  openAuthDialog() {
    this.matDialog.open(AuthDialog, {
      maxHeight: '100vh',
      maxWidth: '100vw',
    });
  }

  openAddNewSpotDialog(): void {
    this.matDialog.open(NewSpotDialogComponent, {
      maxHeight: '100vh',
      maxWidth: '100vw',
    });
  }
}
