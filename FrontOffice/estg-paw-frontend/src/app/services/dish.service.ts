import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { api } from '../../environments/api';

@Injectable({
  providedIn: 'root',
})
export class DishService {
  private apiUrl = `${api.api}/dishes`;

  constructor(private http: HttpClient) {}

  // Get dishes from a specific menu
  getDishesFromMenu(menuId: string, filters?: any): Observable<any[]> {
    let url = `${this.apiUrl}/menu/${menuId}`;

    // Add query parameters if filters are provided
    if (filters) {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return this.http.get<any[]>(url);
  }

  // Get all dishes from a restaurant
  getDishesFromRestaurant(
    restaurantId: string,
    filters?: any
  ): Observable<any[]> {
    let url = `${this.apiUrl}/restaurant/${restaurantId}`;

    // Add query parameters if filters are provided
    if (filters) {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return this.http.get<any[]>(url);
  }

  // Get all dish categories
  getAllCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
  }
}
