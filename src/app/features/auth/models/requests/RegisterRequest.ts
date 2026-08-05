export interface RegisterRequest {
  fName: string;
  lName: string;
  email: string;
  phoneNumber?: string;
  password: string;
}