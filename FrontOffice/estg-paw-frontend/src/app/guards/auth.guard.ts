// Importações necessárias para o AuthGuard em Angular 17+
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { first, tap } from 'rxjs';

// AuthGuard moderno baseado em funções para Angular 17+
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.isAuthenticated$.pipe(
    first(), // Aguarda o primeiro valor (estado real da autenticação)
    tap((isAuthenticated) => {
      if (!isAuthenticated) {
        // Redirecionar para a página de login e armazenar a URL de retorno
        router.navigate(['/login'], {
          queryParams: { returnUrl: state.url },
        });
      }
    })
  );
};
