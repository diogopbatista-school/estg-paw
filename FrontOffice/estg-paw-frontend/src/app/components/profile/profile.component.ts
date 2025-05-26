import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { User } from '../../models/user.module';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  user: User | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    console.log('[ProfileComponent] carregado');
    this.authService.currentUser$.subscribe((user) => {
      this.user = user;
    });
  }

  getUserInitials(): string {
    if (!this.user?.name) return '';

    const nameParts = this.user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

    return (
      nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
    ).toUpperCase();
  }

  getUserRole(): string {
    switch (this.user?.role) {
      case 'admin':
        return 'Administrador';
      case 'client':
        return 'Cliente';
      case 'restaurant':
        return 'Restaurante';
      default:
        return 'Cliente';
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
