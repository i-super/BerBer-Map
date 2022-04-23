import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatDrawer } from '@angular/material/sidenav';
import { ReplaySubject, takeUntil } from 'rxjs';
import { AuthDialog } from './auth_dialog/auth_dialog';
import { auth } from './firebase';
import { NewSpotDialogComponent } from './new_spot_dialog/new_spot_dialog';
import { FirebaseService } from './services/firebase_service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('drawer') drawer!: MatDrawer;

  readonly auth = auth;
  private readonly destroyed = new ReplaySubject<void>(1);

  constructor(readonly firebaseService: FirebaseService, private readonly matDialog: MatDialog) {}

  ngAfterViewInit() {
    this.firebaseService.drawerOpenSubject.pipe(takeUntil(this.destroyed)).subscribe((isOpen) => {
      if (isOpen) {
        this.drawer.open();
      } else {
        this.drawer.close();
      }
    });
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  openAuthDialog() {
    this.matDialog.open(AuthDialog, {
      maxHeight: '100vh',
      maxWidth: '100vw',
    });
  }

  openAddNewSpotDialog(): void {
    this.matDialog.open(NewSpotDialogComponent, {
      disableClose: true,
      maxHeight: '100vh',
      maxWidth: '100vw',
    });
  }

  drawerOpenedChange(isOpen: boolean) {
    this.firebaseService.drawerOpenSubject.next(isOpen);
  }
}
