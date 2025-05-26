import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-timer-warning-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './timer-warning-dialog.component.html',
  styleUrl: './timer-warning-dialog.component.scss',
})
export class TimerWarningDialogComponent {
  constructor(public dialogRef: MatDialogRef<TimerWarningDialogComponent>) {}
}
