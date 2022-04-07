import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

interface Mark {
  label: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'new_spot_dialog',
  templateUrl: 'new_spot_dialog.html',
  styleUrls: ['./new_spot_dialog.scss']

})
export class NewSpotDialogComponent {
  spotLocation = '';
  selectedCategory = '';
  categories = ['Hike', 'Food'];
  selectedIcon :Mark = { label: '', icon: '', color: '' };
  icons = [
    { label: 'Awesome', icon: 'favorite', color: '#ff616f' }, { label: 'Good', icon: 'check_circle', color: '#4caf50' }, { label: 'Naah', icon: 'thumb_down', color: '#0091ea' }];
  tags: string[] = [];
  notes = '';
  // images: [];

  constructor(
    public dialogRef: MatDialogRef<NewSpotDialogComponent>,
  ) {}

  onSave(): void {
    console.log('spotLocation:', this.spotLocation, ', selectedCategory:', this.selectedCategory, ', selectedIcon:', this.selectedIcon, ', tags:', this.tags, ', notes:', this.notes);
  }
}
