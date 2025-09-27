import React from 'react';
import { componentStyles } from '@/lib/design-system';

export type BadgeVariant = 'required' | 'optional' | 'info' | 'purple';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info'
}) => {
  const variantStyles = {
    required: componentStyles.badge.required,
    optional: componentStyles.badge.optional,
    info: componentStyles.badge.info,
    purple: componentStyles.badge.purple,
  };

  return (
    <span className={`${componentStyles.badge.base} ${variantStyles[variant]}`}>
      {children}
    </span>
  );
};