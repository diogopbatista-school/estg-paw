export class User {
  public _id?: string;
  
  constructor(
    public id?: string,
    public name?: string,
    public email?: string,
    public nif?: string,
    public password?: string,
    public confirmPassword?: string,
    public role: string = 'client',
    public phone?: string,
    public order_records: string[] = [],
    public reviews: string[] = [],
    public restaurants: string[] = [],
    public profileImage?: string,
    public created_at?: Date,
    public currentPassword?: string
  ) {
    this._id = id; // Map id to _id for backend compatibility
  }
}

export interface UserResponse {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  profileImage?: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  nif: string;
  phone: string;
  profileImage?: File;
}
