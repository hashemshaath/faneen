import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import type { OtpResponse, OtpVerifyResponse } from './types';

/**
 * Auth Service — Centralized authentication microservice layer
 * All auth operations go through this service for consistency and testability
 */
export const authService = {
  // ─── Email Auth ───────────────────────────────────────
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string, metadata: Record<string, any>) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });
    if (error) throw error;
    return data;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  // ─── Google OAuth ─────────────────────────────────────
  async signInWithGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) throw new Error('Google sign-in failed');
    return result;
  },

  // ─── Phone OTP (Login) ───────────────────────────────
  async sendLoginOtp(phone: string, countryCode: string): Promise<OtpResponse> {
    const { data, error } = await supabase.functions.invoke('send-login-otp', {
      body: { phone: phone.replace(/^0/, ''), country_code: countryCode },
    });
    if (error) throw error;
    return data as OtpResponse;
  },

  async verifyLoginOtp(phone: string, countryCode: string, otpCode: string): Promise<OtpVerifyResponse> {
    const { data, error } = await supabase.functions.invoke('verify-login-otp', {
      body: { phone: phone.replace(/^0/, ''), country_code: countryCode, otp_code: otpCode },
    });
    if (error) throw error;
    return data as OtpVerifyResponse;
  },

  async setSessionFromOtp(response: OtpVerifyResponse) {
    if (response.session) {
      const { error } = await supabase.auth.setSession({
        access_token: response.session.access_token,
        refresh_token: response.session.refresh_token,
      });
      if (error) throw error;
    } else if (response.token_hash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: response.token_hash,
        type: (response.token_type as any) || 'magiclink',
      });
      if (error) throw error;
    } else {
      throw new Error('Login failed');
    }
  },

  // ─── Phone OTP (Onboarding) ──────────────────────────
  async sendOtp(phone: string, countryCode: string): Promise<OtpResponse> {
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: { phone, country_code: countryCode },
    });
    if (error) throw error;
    return data as OtpResponse;
  },

  async verifyOtp(phone: string, countryCode: string, otpCode: string) {
    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { phone, country_code: countryCode, otp_code: otpCode },
    });
    if (error) throw error;
    return data;
  },

  // ─── Profile & Business ──────────────────────────────
  async updateProfile(userId: string, profileData: Record<string, any>) {
    const { error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async createBusiness(userId: string, businessName: string, username: string) {
    const { error } = await supabase
      .from('businesses')
      .insert({
        user_id: userId,
        name_ar: businessName,
        username,
      } as any);
    if (error && !error.message.includes('duplicate')) throw error;
  },

  // ─── Sign Out ────────────────────────────────────────
  async signOut() {
    await supabase.auth.signOut();
  },
};
