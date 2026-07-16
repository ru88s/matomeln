'use client';

import React, { forwardRef, type ComponentProps } from 'react';
import {
  Button as HeroUIButton,
  Input as HeroUIInput,
  TextArea as HeroUITextArea,
} from '@heroui/react';

type ButtonProps = Omit<ComponentProps<typeof HeroUIButton>, 'isDisabled'> & {
  disabled?: boolean;
  title?: string;
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const HeroButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ disabled, className = '', type = 'button', ...props }, ref) => (
    <HeroUIButton
      {...props}
      ref={ref}
      type={type}
      isDisabled={disabled}
      className={`matomeln-hero-button ${className}`}
    />
  )
);
HeroButton.displayName = 'HeroButton';

export const HeroInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => (
    <HeroUIInput
      {...props}
      ref={ref}
      className={`matomeln-hero-input ${className}`}
    />
  )
);
HeroInput.displayName = 'HeroInput';

export const HeroTextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className = '', ...props }, ref) => (
    <HeroUITextArea
      {...props}
      ref={ref}
      className={`matomeln-hero-textarea ${className}`}
    />
  )
);
HeroTextArea.displayName = 'HeroTextArea';

// HeroUI v3 Select uses a collection API. This compatibility wrapper keeps the
// existing native option values while applying the same visual system.
export const HeroSelect = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', ...props }, ref) => (
    <select
      {...props}
      ref={ref}
      className={`matomeln-hero-select ${className}`}
    />
  )
);
HeroSelect.displayName = 'HeroSelect';
