import { Component, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';

import { auth } from '../firebase';

@Component({
  selector: 'auth-dialog',
  templateUrl: 'auth_dialog.html',
  styleUrls: ['./auth_dialog.scss'],
})
export class AuthDialog implements OnDestroy {
  selectedTabIndex = 0;

  email = '';
  password = '';

  loading = false;

  constructor(
    private readonly matDialogRef: MatDialogRef<AuthDialog>,
    private readonly matSnackBar: MatSnackBar
  ) {}

  ngOnDestroy() {}

  onSubmit() {
    if (this.selectedTabIndex === 0) {
      this.login();
    } else if (this.selectedTabIndex === 1) {
      this.signUp();
    } else {
      console.error('Unknown selectedTabIndex');
    }
  }

  private async login() {
    if (this.loading) return;
    this.loading = true;
    try {
      await signInWithEmailAndPassword(auth, this.email, this.password);
      this.matDialogRef.close();
    } catch (error) {
      this.matSnackBar.open(`Login Error: ${error}`, 'Dismiss');
    } finally {
      this.loading = false;
    }
  }

  private async signUp() {
    if (this.loading) return;
    this.loading = true;
    try {
      await createUserWithEmailAndPassword(auth, this.email, this.password);
      this.matDialogRef.close();
    } catch (error) {
      this.matSnackBar.open(`Sign Up Error: ${error}`, 'Dismiss');
    } finally {
      this.loading = false;
    }
  }

  async signInWithGoogle() {
    if (this.loading) return;
    this.loading = true;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      this.matDialogRef.close();
    } catch (error) {
      this.matSnackBar.open(`Sign in with Google Failed: ${error}`, 'Dismiss');
    } finally {
      this.loading = false;
    }
  }
}
