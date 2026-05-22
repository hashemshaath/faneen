import React from 'react';

export interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  dir?: string;
  href?: string;
}

export const InfoRow: React.FC<InfoRowProps> = ({ icon: Icon, label, value, dir, href }) => {
  if (!value) return null;
  const content = (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="text-[10px] text-muted-foreground font-body block">{label}</span>
        <span
          className={`text-xs font-heading font-medium ${href ? 'text-accent hover:underline' : 'text-foreground'}`}
          dir={dir}
        >
          {value}
        </span>
      </div>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  return content;
};