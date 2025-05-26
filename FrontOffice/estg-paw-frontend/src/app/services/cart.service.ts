import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems = new BehaviorSubject<any[]>([]);
  cartItems$ = this.cartItems.asObservable();

  private totalAmount = new BehaviorSubject<number>(0);
  totalAmount$ = this.totalAmount.asObservable();

  constructor() {}

  addToCart(item: any) {
    const currentItems = this.cartItems.getValue();
    const existingItemIndex = currentItems.findIndex(
      i => i.id === item.id && i.dose === item.dose
    );

    if (existingItemIndex > -1) {
      currentItems[existingItemIndex].quantity += item.quantity;
    } else {
      currentItems.push(item);
    }

    this.cartItems.next(currentItems);
    this.updateTotal();
  }

  removeFromCart(index: number) {
    const currentItems = this.cartItems.getValue();
    currentItems.splice(index, 1);
    this.cartItems.next(currentItems);
    this.updateTotal();
  }

  updateQuantity(index: number, quantity: number) {
    const currentItems = this.cartItems.getValue();
    if (quantity <= 0) {
      this.removeFromCart(index);
    } else {
      currentItems[index].quantity = quantity;
      this.cartItems.next(currentItems);
      this.updateTotal();
    }
  }

  private updateTotal() {
    const total = this.cartItems.getValue().reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    this.totalAmount.next(total);
  }

  clearCart() {
    this.cartItems.next([]);
    this.totalAmount.next(0);
  }
}
