import {
  HttpRequest,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';

/**
 * Auth interceptor function para lidar com token de autenticação
 * e erros não autorizados (401)
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const document = inject(DOCUMENT);
  // Só tenta obter o token se estiver no navegador
  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('token');

    // Se o token existir, adiciona ao cabeçalho da requisição
    if (token) {
      const modifiedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Request with token:', {
        url: modifiedReq.url,
        headers: modifiedReq.headers.keys(),
      });

      req = modifiedReq;
    }
  }

  // Retorna a requisição com tratamento de erro
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('HTTP Error:', error);

      // Trata erros 401 (não autorizado)
      if (error.status === 401) {
        console.log('401 Unauthorized - clearing token');
        // Limpa o token se estiver no navegador
        if (isPlatformBrowser(platformId)) {
          localStorage.removeItem('token');
        }

        // Redireciona para a página de login
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
