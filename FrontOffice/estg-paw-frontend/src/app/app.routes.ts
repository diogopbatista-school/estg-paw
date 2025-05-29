import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { RestaurantListComponent } from './components/restaurant-list/restaurant-list.component';
import { RestaurantInfoComponent } from './components/restaurant-info/restaurant-info.component';
import { CreateOrderComponent } from './components/create-order/create-order.component';
import { TrackOrderComponent } from './components/track-order/track-order.component';
import { OrderListComponent } from './components/order-list/order-list.component';
import { authGuard } from './guards/auth.guard';
import { CreateVoucherComponent } from './components/create-voucher/create-voucher.component';
import { ProcessPaymentComponent } from './components/process-payment/process-payment.component';
import { ProcessVoucherPaymentComponent } from './components/process-voucher-payment/process-voucher-payment.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'restaurants', component: RestaurantListComponent },
  { path: 'restaurant/:id', component: RestaurantInfoComponent },
  { path: 'orders', component: OrderListComponent, canActivate: [authGuard] },
  { path: 'restaurant/:id/order', component: CreateOrderComponent, canActivate: [authGuard] },
  { path: 'orders/track', component: TrackOrderComponent, canActivate: [authGuard] },
  { path: 'vouchers', component: CreateVoucherComponent, canActivate: [authGuard] },
  { path: 'create-voucher', component: CreateVoucherComponent, canActivate: [authGuard] },
  { path: 'process-payment', component: ProcessPaymentComponent, canActivate: [authGuard] },
  { path: 'process-voucher-payment', component: ProcessVoucherPaymentComponent, canActivate: [authGuard] },

  // Rotas protegidas
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'userInfo',
        loadComponent: () =>
          import('./components/user-info/user-info.component').then((m) => m.UserInfoComponent),
        canActivate: [authGuard],
      },
      {
        path: 'edit',
        loadComponent: () =>
          import('./components/user-edit/user-edit.component').then((m) => m.UserEditComponent),
        canActivate: [authGuard],
      },
    ],
  },

  // Rota para página não encontrada (404)
  { path: '**', component: NotFoundComponent },
];
