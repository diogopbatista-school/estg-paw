import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  isPasswordVisible: boolean = false;
  error: string = '';
  returnUrl: string = '/dashboard';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Capturar URL de retorno dos parâmetros de consulta se existir
    this.route.queryParams.subscribe((params) => {
      this.returnUrl = params['returnUrl'] || '/dashboard';
    });

    // Se o usuário já estiver autenticado, redirecione para o dashboard
    this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.router.navigateByUrl(this.returnUrl);
      }
    });
  }

  login(): void {
    if (!this.email || !this.password) {
      this.error = 'Por favor, preencha os campos obrigatórios.';
      return;
    }

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        // Verifica se a role é client
        const user = response?.user || this.authService.getCurrentUser();
        if (user && user.role !== 'client') {
          this.error =
            'Apenas utilizadores com perfil de cliente podem aceder à plataforma de cliente.';
          this.authService.logout();
          return;
        }
        // O AuthService já cuida do armazenamento do token e usuário
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        if (err instanceof Error) {
          this.error = err.message;
        } else {
          this.error = 'Credenciais inválidas ou erro de conexão.';
        }
      },
    });
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
    const passwordInput = document.getElementById(
      'password'
    ) as HTMLInputElement;
    passwordInput.type = this.isPasswordVisible ? 'text' : 'password';
  }
}
