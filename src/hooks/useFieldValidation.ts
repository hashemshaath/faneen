import { useState, useCallback } from 'react';
import { validateEmail, validatePhone } from '@/lib/password-strength';

interface FieldError {
  email?: string;
  phone?: string;
}

export function useFieldValidation(isRTL: boolean) {
  const [errors, setErrors] = useState<FieldError>({});
  const [emailChecking, setEmailChecking] = useState(false);

  const clearError = useCallback((field: keyof FieldError) => {
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const validateEmailField = useCallback((email: string) => {
    if (!email) {
      setErrors(prev => ({ ...prev, email: undefined }));
      return;
    }
    const trimmed = email.trim();
    if (!validateEmail(trimmed)) {
      setErrors(prev => ({
        ...prev,
        email: isRTL ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format',
      }));
      return false;
    }
    // Check domain has valid structure (at least one dot after @)
    const domain = trimmed.split('@')[1];
    if (!domain || domain.split('.').some(p => p.length === 0)) {
      setErrors(prev => ({
        ...prev,
        email: isRTL ? 'نطاق البريد الإلكتروني غير صالح' : 'Invalid email domain',
      }));
      return false;
    }
    setErrors(prev => ({ ...prev, email: undefined }));
    return true;
  }, [isRTL]);

  const validatePhoneField = useCallback((phone: string) => {
    if (!phone) {
      setErrors(prev => ({ ...prev, phone: undefined }));
      return;
    }
    if (!validatePhone(phone)) {
      setErrors(prev => ({
        ...prev,
        phone: isRTL ? 'رقم الجوال غير صحيح (7-15 رقم)' : 'Invalid phone number (7-15 digits)',
      }));
      return false;
    }
    setErrors(prev => ({ ...prev, phone: undefined }));
    return true;
  }, [isRTL]);

  return { errors, emailChecking, validateEmailField, validatePhoneField, clearError };
}
