import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from '../../models/user.module';
import { UserService } from '../../services/user.service';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-edit.component.html',
  styleUrl: './user-edit.component.scss',
})
export class UserEditComponent implements OnInit {
  user: User = {
    password: '',
    confirmPassword: '',
    currentPassword: ''
  } as User;
  image: File | null = null;
  imagePreview: string | null = null;
  isPasswordVisible = false;
  isConfirmPasswordVisible = false;  isCurrentPasswordVisible = false;
  error: string = '';

  constructor(
    private userService: UserService, 
    private router: Router,
    private imageService: ImageService
  ) {}  ngOnInit(): void {
    // Carregar dados do usuário do localStorage ou outro serviço se necessário
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      
      // Converter o caminho da imagem para URL completa se existir
      if (userData.profileImage) {
        console.log('Profile image path:', userData.profileImage);
        userData.profileImage = this.imageService.getProfileImageUrl(userData.profileImage);
        console.log('Converted profile image URL:', userData.profileImage);
      }
      
      // Excluir os campos de senha para não serem carregados
      this.user = { 
        ...userData,
        password: '',
        confirmPassword: '',
        currentPassword: ''
      };
    }
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.image = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  toggleConfirmPasswordVisibility() {
    this.isConfirmPasswordVisible = !this.isConfirmPasswordVisible;
  }
  toggleCurrentPasswordVisibility() {
    this.isCurrentPasswordVisible = !this.isCurrentPasswordVisible;
  }
  clearError() {
    // Limpa as mensagens de erro quando o usuário começa a digitar novamente
    if (this.error) {
      this.error = '';
    }
  }
  clearPasswordFields() {
    // Limpa todos os campos de senha
    this.user.password = '';
    this.user.confirmPassword = '';
    this.user.currentPassword = '';
  }

  // Método para navegar para o dashboard
  navigateToDashboard() {
    this.router.navigate(['/dashboard']).then(() => {
      window.location.reload();
    });
  }

  // Método para retornar a URL correta da imagem de perfil
  getProfileImageUrl(imagePath: string | null | undefined): string {
    if (this.imagePreview) {
      return this.imagePreview;
    }
    if (imagePath) {
      return imagePath;
    }
    return this.imageService.getProfileImageUrl('');
  }
  editUser() {
    // Validações básicas
    if (
      !this.user.name ||
      !this.user.email ||
      !this.user.nif ||
      !this.user.phone
    ) {
      this.error = 'Por favor, preencha todos os campos obrigatórios.';
      return;
    }
    if (!this.user.currentPassword) {
      this.error = 'A senha atual é obrigatória para editar o perfil.';
      return;
    }
    if (
      this.user.password &&
      this.user.password !== this.user.confirmPassword
    ) {
      this.error = 'As senhas não coincidem.';
      return;
    }
    this.error = '';
    const formData = new FormData();
    formData.append('name', this.user.name || '');
    formData.append('email', this.user.email || '');
    formData.append('nif', this.user.nif || '');
    formData.append('phone', this.user.phone || '');
    formData.append('currentPassword', this.user.currentPassword || '');
    if (this.user.password) formData.append('password', this.user.password);
    if (this.user.confirmPassword)
      formData.append('confirmPassword', this.user.confirmPassword);
    if (this.image) formData.append('profileImage', this.image);

    // Debug: mostrar o conteúdo do FormData
    for (const [key, value] of formData.entries()) {
      console.log('FormData:', key, value);
    }    this.userService.updateProfile(formData).subscribe({
      next: (response: any) => {
        // Atualiza o localStorage com os novos dados do usuário,
        // garantindo que os campos de senha não sejam armazenados
        if (response && response.user) {
          // Criamos uma cópia do objeto retornado para não modificar o original
          const userToStore = { ...response.user };
          
          // Removemos os campos sensíveis antes de salvar
          delete userToStore.password;
          delete userToStore.confirmPassword;
          delete userToStore.currentPassword;
          
          // Se a imagem de perfil foi atualizada, vamos apenas armazenar o caminho
          // O ImageService será responsável por gerar a URL completa quando necessário
          console.log('Nova imagem de perfil:', userToStore.profileImage);
          
          localStorage.setItem('user', JSON.stringify(userToStore));
        }
        
        // Limpa os campos de senha e o erro
        this.clearPasswordFields();
        this.error = '';
        
        // Redireciona para o dashboard sem mostrar alerta
        this.navigateToDashboard();
      },
      error: (err: any) => {
        console.error('Erro na atualização do perfil:', err);

        if (err.error && typeof err.error === 'object' && err.error.message) {
          // Caso o backend retorne um objeto de erro com mensagem
          this.error = err.error.message;
        } else if (
          err.message?.includes('Email já está em uso') ||
          err.message?.includes('Email already exists')
        ) {
          this.error = 'Este email já está em uso.';
        } else if (
          err.message?.includes('NIF já está em uso') ||
          err.message?.includes('NIF already exists')
        ) {
          this.error = 'Este NIF já está em uso.';
        } else if (err.error && typeof err.error === 'string') {
          // Caso o backend retorne uma string de erro direta
          this.error = err.error;
        } else {
          this.error =
            err.message ||
            'Ocorreu um erro ao atualizar o perfil. Por favor, tente novamente.';
        }
        // Não usar mais o alert, o erro agora é exibido no div de alerta
      },
    });
  }
}
