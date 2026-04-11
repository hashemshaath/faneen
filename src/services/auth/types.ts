export type AuthMode = 'login' | 'register' | 'forgot-password' | 'email-sent';
export type LoginMethod = 'phone' | 'email';
export type RegisterType = 'individual' | 'business';
export type RegisterStep = 'type' | 'details' | 'business-details';

export interface OtpState {
  otpStep: boolean;
  otpCode: string;
  demoOtp: string | null;
  cooldown: number;
  loading: boolean;
}

export interface AuthFormState {
  phone: string;
  countryCode: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  businessName: string;
  username: string;
}

export interface OtpResponse {
  success: boolean;
  error?: string;
  message?: string;
  demo_otp?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  error?: string;
  message?: string;
  session?: {
    access_token: string;
    refresh_token: string;
  };
  token_hash?: string;
  token_type?: string;
}
