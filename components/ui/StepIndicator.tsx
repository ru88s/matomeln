import React from 'react';
import { gradients, componentStyles } from '@/lib/design-system';

export interface StepIndicatorProps {
  number: number;
  variant?: 'pink' | 'purple' | 'sky' | 'green';
  size?: 'small' | 'large';
}

const variantMap = {
  pink: gradients.pink,
  purple: gradients.purple,
  sky: gradients.primary,
  green: gradients.green,
} as const;

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  number,
  variant = 'pink',
  size = 'small'
}) => {
  const isLarge = size === 'large';
  const containerClass = isLarge
    ? componentStyles.stepNumber.largeContainer
    : componentStyles.stepNumber.container;
  const textClass = isLarge
    ? componentStyles.stepNumber.largeText
    : componentStyles.stepNumber.text;
  const gradient = variantMap[variant];

  return (
    <div className={`${containerClass} ${gradient}`}>
      <span className={textClass}>{number}</span>
    </div>
  );
};