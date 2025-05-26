import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { User } from '../../models/user.module';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  user: User = {} as User;
  image: File | null = null;
  imagePreview: string | null = null;
  isPasswordVisible: boolean = false;
  isConfirmPasswordVisible: boolean = false;
  error: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    console.log('[RegisterComponent] carregado');
  }

  onFileChange(event: any) {
    const files = event.target.files;
    this.image = files.length > 0 ? files[0] : null;

    // Pré-visualização da imagem
    if (this.image) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.image);
    } else {
      this.imagePreview = null;
    }
  }
  register() {
    console.log('Tentando registrar usuário:', this.user);

    // Validar campos obrigatórios
    if (
      !this.user.name ||
      !this.user.email ||
      !this.user.phone ||
      !this.user.nif ||
      !this.user.password ||
      !this.user.confirmPassword
    ) {
      this.error = 'Por favor, preencha todos os campos obrigatórios.';
      return;
    }

    // Validar coincidência das senhas
    if (this.user.password !== this.user.confirmPassword) {
      this.error = 'As senhas não coincidem.';
      return;
    }

    // Validar formato de email
    if (!this.isValidEmail(this.user.email)) {
      this.error = 'E-mail inválido!';
      return;
    }

    // Validar formato do NIF
    if (!this.isValidNIF(this.user.nif)) {
      this.error = 'NIF inválido! Deve conter 9 dígitos.';
      return;
    }

    // Validar telefone
    if (!this.isValidPhone(this.user.phone)) {
      this.error = 'Contacto Telefónico inválido!';
      return;
    }

    // Validar complexidade da senha
    if (!this.isValidPassword(this.user.password)) {
      this.error =
        'A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.';
      return;
    } // Se todas as validações passarem, enviar para o backend
    this.authService.register(this.user, this.image).subscribe({
      next: (response) => {
        // Limpar formulário e mostrar mensagem de sucesso
        this.error = '';
        alert(
          'Registro concluído com sucesso! Redirecionando para a página de login...'
        );
        console.log('Registro realizado:', response);

        // Redirecionamento para login após breve atraso
        setTimeout(() => {
          this.router.navigateByUrl('/login');
        }, 1500);
      },
      error: (err) => {
        console.error('Erro no registro:', err);

        if (
          err.message?.includes('Email já está em uso') ||
          err.message?.includes('Email already exists')
        ) {
          this.error = 'Este email já está em uso.';
        } else if (
          err.message?.includes('NIF já está em uso') ||
          err.message?.includes('NIF already exists')
        ) {
          this.error = 'Este NIF já está em uso.';
        } else {
          this.error =
            err.message ||
            'Ocorreu um erro ao efetuar o registro. Por favor, tente novamente.';
        }
      },
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  }
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[0-9]{9}$/;
    return phoneRegex.test(phone);
  }

  private isValidNIF(nif: string): boolean {
    const nifRegex = /^[0-9]{9}$/;
    return nifRegex.test(nif);
  }

  private isValidPassword(password: string): boolean {
    // Pelo menos 8 caracteres, 1 letra maiúscula, 1 minúscula e 1 número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  }

  private isValidCP(cp: string): boolean {
    const cpRegex = /^\d{4}-\d{3}$/;
    return cpRegex.test(cp);
  }

  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  toggleConfirmPasswordVisibility() {
    this.isConfirmPasswordVisible = !this.isConfirmPasswordVisible;
  }
}
