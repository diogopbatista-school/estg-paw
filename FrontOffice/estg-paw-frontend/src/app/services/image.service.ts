import { Injectable } from '@angular/core';
import { api } from '../../environments/api';

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  constructor() {}
  /**
   * Gera a URL completa para uma imagem do backend
   * @param imagePath Caminho da imagem no backend (geralmente começa com '/uploads/')
   * @param defaultImage Caminho da imagem padrão caso a imagePath esteja vazia
   * @returns URL completa para a imagem
   */
  getImageUrl(
    imagePath: string,
    defaultImage: string = '/assets/images/restaurant-placeholder.svg'
  ): string {
    if (!imagePath) return defaultImage;

    // Se a imagem já for uma URL completa (começa com http ou https), use-a como está
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Caso contrário, combine a URL base do backend com o caminho da imagem
    // Garante que o caminho sempre comece com "/" se não começar
    if (!imagePath.startsWith('/')) {
      imagePath = '/' + imagePath;
    }

    return `${api.baseUrl}${imagePath}`;
  }

  /**
   * Gera a URL completa para uma imagem de restaurante
   * @param imagePath Caminho da imagem do restaurante
   * @returns URL completa para a imagem do restaurante
   */
  getRestaurantImageUrl(imagePath: string): string {
    return this.getImageUrl(imagePath, '/assets/images/default-restaurant.jpg');
  }

  /**
   * Gera a URL completa para uma imagem de prato
   * @param imagePath Caminho da imagem do prato
   * @returns URL completa para a imagem do prato
   */
  getDishImageUrl(imagePath: string): string {
    return this.getImageUrl(imagePath, '/assets/images/default-dish.jpg');
  }

  /**
   * Gera a URL completa para uma imagem de perfil de usuário
   * @param imagePath Caminho da imagem de perfil
   * @returns URL completa para a imagem de perfil
   */
  getProfileImageUrl(imagePath: string): string {
    return this.getImageUrl(imagePath, '/assets/images/default-profile.jpg');
  }
}
