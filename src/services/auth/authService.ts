import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { updateProfile as updateProfileService } from '@/modules/users';
import { insertBusiness } from '@/modules/businesses';
import type { OtpResponse, OtpVerifyResponse } from './types';
import { sanitizeInput } from '@/lib/password-strength';

/**
 * Auth Service — Centralized authentication microservice layer
 * All auth operations go through this service for consistency and testability
 */
export const authService = {
  // ─── Email Auth ───────────────────────────────────────
  async signInWithEmail(email: string, password: string) {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) throw new Error('Email and password required');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string, metadata: { full_name?: string; account_type?: string; phone?: string }) {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) throw new Error('Email and password required');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');

    // Sanitize metadata
    const sanitizedMeta = {
      full_name: sanitizeInput(metadata.full_name || ''),
      account_type: metadata.account_type || 'individual',
      phone: metadata.phone || '',
    };

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: sanitizedMeta,
      },
    });
    if (error) throw error;

    // Check if user was already registered (Supabase returns user with identities=[] for existing)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error('already registered');
    }

    // Send welcome email (non-blocking, idempotent)
    if (data.user?.id) {
      const userId = data.user.id;
      void sendTransactionalEmail({
        templateName: 'welcome-signup',
        recipientEmail: trimmedEmail,
        idempotencyKey: `welcome-${userId}`,
        templateData: {
          fullName: sanitizedMeta.full_name || undefined,
          dashboardUrl: `${window.location.origin}/dashboard`,
        },
      }).catch(() => { /* swallow — handled by queue retries */ });
    }

    return data;
  },

  async resetPassword(email: string) {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) throw new Error('Email required');

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async resendConfirmation(email: string) {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) throw new Error('Email required');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: trimmedEmail,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  async updatePassword(password: string) {
    if (!password || password.length < 8) throw new Error('Password must be at least 8 characters');
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
    const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
    if (cleanPhone.length < 7) throw new Error('Invalid phone number');

    const { data, error } = await supabase.functions.invoke('send-login-otp', {
      body: { phone: cleanPhone, country_code: countryCode },
    });
    if (error) throw error;
    return data as OtpResponse;
  },

  async verifyLoginOtp(phone: string, countryCode: string, otpCode: string): Promise<OtpVerifyResponse> {
    const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
    if (!/^\d{6}$/.test(otpCode)) throw new Error('OTP must be 6 digits');

    const { data, error } = await supabase.functions.invoke('verify-login-otp', {
      body: { phone: cleanPhone, country_code: countryCode, otp_code: otpCode },
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
        type: (response.token_type || 'magiclink') as 'magiclink' | 'email' | 'signup' | 'invite' | 'recovery',
      });
      if (error) throw error;
    } else {
      throw new Error('Login failed - no session data');
    }
  },

  // ─── Phone OTP (Onboarding) ──────────────────────────
  async sendOtp(phone: string, countryCode: string): Promise<OtpResponse> {
    const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
    if (cleanPhone.length < 7) throw new Error('Invalid phone number');

    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: { phone: cleanPhone, country_code: countryCode },
    });
    if (error) throw error;
    return data as OtpResponse;
  },

  async verifyOtp(phone: string, countryCode: string, otpCode: string) {
    const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
    if (!/^\d{6}$/.test(otpCode)) throw new Error('OTP must be 6 digits');

    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { phone: cleanPhone, country_code: countryCode, otp_code: otpCode },
    });
    if (error) throw error;
    return data;
  },

  // ─── Profile & Business ──────────────────────────────
  async updateProfile(userId: string, profileData: {
    full_name?: string;
    account_type?: 'individual' | 'business' | 'company';
    is_onboarded?: boolean;
    phone?: string;
    country_code?: string;
  }) {
    // Sanitize text inputs
    const sanitized = {
      ...profileData,
      ...(profileData.full_name ? { full_name: sanitizeInput(profileData.full_name) } : {}),
    };

    const { error } = await updateProfileService({ userId, values: sanitized });
    if (error) throw error;
  },

  async createBusiness(
    userId: string,
    businessName: string,
    username: string,
    extras?: {
      sectors?: string[];
      sub_services?: string[];
      description_ar?: string;
      recipientEmail?: string;
      entity_type?: string;
      capabilities?: Record<string, boolean>;
      national_id?: string;
      unified_number?: string;
      vat_number?: string;
      website?: string;
      name_en?: string;
    },
  ) {
    const sanitizedName = sanitizeInput(businessName);
    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (sanitizedUsername.length < 3) throw new Error('Username must be at least 3 characters');

    const { error } = await insertBusiness({
      payload: {
        user_id: userId,
        name_ar: sanitizedName,
        ...(extras?.name_en ? { name_en: sanitizeInput(extras.name_en) } : {}),
        username: sanitizedUsername,
        sectors: extras?.sectors ?? [],
        sub_services: extras?.sub_services ?? [],
        description_ar: extras?.description_ar ? sanitizeInput(extras.description_ar) : null,
        approval_status: 'draft',
        username_status: 'pending',
        // REGISTRATION-UX-FULL-COMPLETE-1 — additive entity fields (all nullable).
        ...(extras?.entity_type ? { entity_type: extras.entity_type } : {}),
        ...(extras?.capabilities ? { capabilities: extras.capabilities } : {}),
        ...(extras?.national_id ? { national_id: sanitizeInput(extras.national_id) } : {}),
        ...(extras?.unified_number ? { unified_number: sanitizeInput(extras.unified_number) } : {}),
        ...(extras?.vat_number ? { vat_number: sanitizeInput(extras.vat_number) } : {}),
        ...(extras?.website ? { website: sanitizeInput(extras.website) } : {}),
      },
      terminal: 'none',
    });
    const errMessage =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : '';
    if (error && !errMessage.includes('duplicate')) throw error;

    // Welcome-business email — fire-and-forget; idempotency key bound to
    // userId so the queue de-dupes if onboarding runs twice. Failures must
    // never break onboarding. Recipient preferences are honored server-side
    // by `send-transactional-email` via the TEMPLATE_CATEGORY map.
    if (!error && extras?.recipientEmail) {
      void sendTransactionalEmail({
        templateName: 'welcome-business',
        recipientEmail: extras.recipientEmail,
        idempotencyKey: `welcome-business-${userId}`,
        templateData: {
          businessName: sanitizedName || undefined,
          dashboardUrl: `${window.location.origin}/dashboard`,
        },
      }).catch(() => { /* swallow — handled by queue retries */ });
    }
  },

  // ─── Sign Out ────────────────────────────────────────
  async signOut() {
    await supabase.auth.signOut();
  },
};
