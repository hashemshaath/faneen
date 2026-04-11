import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { checkPasswordStrength } from '@/lib/password-strength';

interface PasswordFieldProps {
  password: string;
  onChange: (val: string) => void;
  label: string;
  showStrength?: boolean;
  isRTL: boolean;
  showPassword: boolean;
  onToggleShow: () => void;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  password, onChange, label, showStrength = false, isRTL,
  showPassword, onToggleShow,
}) => {
  const strength = checkPasswordStrength(password);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Lock className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
        <Input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingInlineStart: '40px', paddingInlineEnd: '40px' }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute top-3 text-muted-foreground hover:text-foreground transition-colors"
          style={{ [isRTL ? 'left' : 'right']: '12px' }}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {showStrength && password && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{isRTL ? 'قوة كلمة المرور' : 'Password strength'}</span>
            <span className="font-medium">{strength.label}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${strength.percentage}%`,
                backgroundColor: strength.score <= 1 ? 'hsl(var(--destructive))' : strength.score === 2 ? 'hsl(var(--gold))' : 'hsl(142, 76%, 36%)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
