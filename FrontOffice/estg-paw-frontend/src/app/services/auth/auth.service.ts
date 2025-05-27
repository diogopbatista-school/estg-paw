// Importar o isPlatformBrowser para verificar se estamos no navegador ou no servidor
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  of,
  tap,
  throwError,
} from 'rxjs';
import { User, AuthResponse, LoginData } from '../../models/user.module';
import { ImageService } from '../image.service';

// API URL - substitua pela sua configuração de ambiente
const API_BASE_URL = 'http://localhost:3000/api/auth';

const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
  }),
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private isBrowser: boolean;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  public isAuthenticated$: Observable<boolean>;

  constructor(
    private http: HttpClient,
    private router: Router,
    private imageService: ImageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Initialize with stored user if available
    const initialUser = this.isBrowser ? this.getUserFromStorage() : null;

    this.currentUserSubject = new BehaviorSubject<User | null>(initialUser);
    this.currentUser$ = this.currentUserSubject.asObservable();

    const hasToken = this.isBrowser && !!this.getToken();

    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(hasToken);
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

    // If we have a token but no user, try to refresh the state
    if (hasToken && !initialUser) {
      this.refreshUserState();
    }
  }

  // Métodos para acessar localStorage de forma segura
  private getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  private getUserFromStorage(): User | null {
    if (!this.isBrowser) return null;

    const userStr = localStorage.getItem('user');
    console.log('User from localStorage:', userStr);

    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        console.log('Parsed user data:', userData);

        // Ensure both id and _id are set
        if (userData.id && !userData._id) {
          userData._id = userData.id;
        } else if (userData._id && !userData.id) {
          userData.id = userData._id;
        }

        // Process profile image URL if present
        if (userData.profileImage) {
          userData.profileImage = this.imageService.getProfileImageUrl(
            userData.profileImage
          );
        }

        return userData;
      } catch (err) {
        console.error('Error parsing user data:', err);
        return null;
      }
    }
    return null;
  }

  // Login
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${API_BASE_URL}/login`,
        { email, password },
        httpOptions
      )
      .pipe(
        tap((response) => {
          // Ensure user data has both id and _id fields
          const userData = {
            ...response.user,
            _id: response.user.id || response.user._id,
            id: response.user.id || response.user._id,
          };

          if (this.isBrowser) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(userData));
          }
          this.currentUserSubject.next(userData as User);
          this.isAuthenticatedSubject.next(true);
        }),
        catchError((error) => {
          console.error('Login error:', error);
          let errorMessage = 'Falha no login';

          if (error.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            }
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Registro
  register(
    user: User,
    profileImage: File | null = null
  ): Observable<AuthResponse> {
    const formData = new FormData();
    formData.append('name', user.name || '');
    formData.append('email', user.email || '');
    formData.append('nif', user.nif || '');
    formData.append('password', user.password || '');
    formData.append('confirmPassword', user.confirmPassword || '');
    formData.append('phone', user.phone || '');

    if (profileImage) {
      formData.append('profileImage', profileImage);
    }

    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/register`, formData)
      .pipe(
        tap((response) => {
          // Ensure user data has both id and _id fields
          const userData = {
            ...response.user,
            _id: response.user.id || response.user._id,
            id: response.user.id || response.user._id,
          };

          if (this.isBrowser) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(userData));
          }
          this.currentUserSubject.next(userData as User);
          this.isAuthenticatedSubject.next(true);
        }),
        catchError((error) => {
          console.error('Registro error:', error);
          let errorMessage = 'Falha no registro';

          if (error.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            }
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Logout
  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/']); // Redirect to home page instead of /login
  }

  getCurrentUser(): User | null {
    const user = this.currentUserSubject.getValue();
    console.log('Current user from subject:', user);
    return user;
  }

  refreshUserState(): void {
    if (this.isBrowser) {
      const storedUser = this.getUserFromStorage();
      console.log('Refreshing user state with stored user:', storedUser);
      if (storedUser) {
        this.currentUserSubject.next(storedUser);
        this.isAuthenticatedSubject.next(true);
      }
    }
  }

  isAuthenticated(): boolean {
    const isAuth = this.isAuthenticatedSubject.getValue();
    const hasToken = !!this.getToken();
    console.log('Auth check:', { isAuth, hasToken });
    return isAuth && hasToken;
  }
}
