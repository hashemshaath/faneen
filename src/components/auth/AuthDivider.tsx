import React from 'react';

interface AuthDividerProps {
  isRTL: boolean;
}

export const AuthDivider: React.FC<AuthDividerProps> = ({ isRTL }) => (
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t border-border" />
    </div>
    <div className="relative flex justify-center text-xs uppercase">
      <span className="bg-background px-3 text-muted-foreground">{isRTL ? 'أو' : 'or'}</span>
    </div>
  </div>
);
