import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { User } from '../../models/user.module';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  isAuthenticated = false;
  currentUser: User | null = null;
  isMobileMenuOpen = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Observar o estado de autenticação
    this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      this.isAuthenticated = isAuthenticated;
    });

    // Observar os detalhes do usuário atual
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }
  logout(): void {
    this.authService.logout();
    this.isMobileMenuOpen = false;
  }

  getUserInitial(): string {
    if (
      !this.currentUser ||
      !this.currentUser.name ||
      this.currentUser.name.length === 0
    ) {
      return 'U';
    }
    return this.currentUser.name.charAt(0).toUpperCase();
  }

  getUserName(): string {
    return this.currentUser?.name || 'Usuário';
  }
}
