import React from 'react';
import { StepIndicator, StepIndicatorProps } from './StepIndicator';
import { Badge, BadgeVariant } from './Badge';

export interface StepHeaderProps {
  number: number;
  title: string;
  badge?: {
    text: string;
    variant?: BadgeVariant;
  };
  variant?: StepIndicatorProps['variant'];
}

export const StepHeader: React.FC<StepHeaderProps> = ({
  number,
  title,
  badge,
  variant = 'pink'
}) => {
  return (
    <div className="flex items-center gap-3 mb-4">
      <StepIndicator number={number} variant={variant} />
      <h2 className="text-lg font-bold text-gray-900">
        {title}
      </h2>
      {badge && (
        <Badge variant={badge.variant}>
          {badge.text}
        </Badge>
      )}
    </div>
  );
};