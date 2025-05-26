import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { Observable } from 'rxjs';
import { User } from '../../models/user.module';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-user-info',
  standalone: true,
  imports: [CommonModule, TitleCasePipe, RouterModule],
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.scss'],
})
export class UserInfoComponent implements OnInit {
  user$: Observable<User | null>;

  constructor(
    private authService: AuthService,
    private imageService: ImageService
  ) {
    this.user$ = this.authService.currentUser$;
  }
  ngOnInit(): void {
    console.log('[UserInfoComponent] carregado');
    this.user$ = this.authService.currentUser$;
  }
  // Método para gerar a URL correta da imagem de perfil
  getProfileImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) return this.imageService.getProfileImageUrl('');
    
    console.log('UserInfo component - User profile image path:', imagePath);
    const imageUrl = this.imageService.getProfileImageUrl(imagePath);
    console.log('UserInfo component - Generated image URL:', imageUrl);
    
    return imageUrl;
  }
}
