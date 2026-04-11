import React from 'react';
import { AlertCircle } from 'lucide-react';

export const FieldError: React.FC<{ message?: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-destructive mt-1 animate-fade-in">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  );
};
