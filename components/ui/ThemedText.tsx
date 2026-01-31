// components/ui/ThemedText.tsx
import React from 'react';
import { Text, TextProps } from 'react-native';
import { cn } from '../../lib/utils';

// Extended text variants
type ThemedTextVariant =
  | 'default'
  | 'muted'
  | 'soft'
  | 'error'
  | 'success'
  | 'warning'
  | 'brand'
  | 'accent'
  | 'heading'
  | 'subheading'
  | 'title'
  | 'display'
  | 'label'
  | 'caption'
  | 'link'
  | 'code'
  | 'quote';

// Extended text sizes
type ThemedTextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

// Text weights
type ThemedTextWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'black';

// Text alignment
type ThemedTextAlign = 'auto' | 'left' | 'right' | 'center' | 'justify';

interface ThemedTextProps extends TextProps {
  variant?: ThemedTextVariant;
  size?: ThemedTextSize;
  weight?: ThemedTextWeight;
  align?: ThemedTextAlign;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  underline?: boolean;
  italic?: boolean;
  strikeThrough?: boolean;
  uppercase?: boolean;
  capitalize?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const ThemedText = React.forwardRef<Text, ThemedTextProps>(
  ({ 
    variant = 'default', 
    size = 'base', 
    weight = 'regular',
    align = 'auto',
    numberOfLines,
    ellipsizeMode = 'tail',
    underline = false,
    italic = false,
    strikeThrough = false,
    uppercase = false,
    capitalize = false,
    className,
    style,
    ...props 
  }, ref) => {
    
    // Map variant to color class
    const variantClasses: Record<ThemedTextVariant, string> = {
      default: 'text-text dark:text-dark-text',
      muted: 'text-text-muted dark:text-dark-text-muted',
      soft: 'text-text-soft dark:text-dark-text-soft',
      error: 'text-error dark:text-dark-error',
      success: 'text-success dark:text-dark-success',
      warning: 'text-warning dark:text-dark-warning',
      brand: 'text-brand dark:text-dark-brand',
      accent: 'text-accent dark:text-dark-accent',
      heading: 'text-text dark:text-dark-text',
      subheading: 'text-text dark:text-dark-text',
      title: 'text-text dark:text-dark-text',
      display: 'text-text dark:text-dark-text',
      label: 'text-text-soft dark:text-dark-text-soft',
      caption: 'text-text-muted dark:text-dark-text-muted',
      link: 'text-brand dark:text-dark-brand',
      code: 'text-text bg-surface-muted dark:bg-dark-surface-muted font-mono',
      quote: 'text-text-muted dark:text-dark-text-muted border-l-4 border-border dark:border-dark-border',
    };

    // Map size to font size class
    const sizeClasses: Record<ThemedTextSize, string> = {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
    };

    // Map weight to font family class
    const weightClasses: Record<ThemedTextWeight, string> = {
      regular: 'font-inter-regular',
      medium: 'font-inter-medium',
      semibold: 'font-inter-semibold',
      bold: 'font-inter-bold',
      black: 'font-inter-bold', // Fallback to bold if black not available
    };

    // Map alignment to text align class
    const alignClasses: Record<ThemedTextAlign, string> = {
      auto: 'text-auto',
      left: 'text-left',
      right: 'text-right',
      center: 'text-center',
      justify: 'text-justify',
    };

    // Variant-specific weight defaults
    const getVariantWeight = (): ThemedTextWeight => {
      switch (variant) {
        case 'heading':
        case 'title':
        case 'display':
          return 'bold';
        case 'subheading':
        case 'label':
          return 'semibold';
        case 'caption':
        case 'quote':
          return 'regular';
        default:
          return weight;
      }
    };

    // Variant-specific size defaults
    const getVariantSize = (): ThemedTextSize => {
      switch (variant) {
        case 'display':
          return '4xl';
        case 'title':
          return '3xl';
        case 'heading':
          return '2xl';
        case 'subheading':
          return 'xl';
        case 'label':
          return 'sm';
        case 'caption':
          return 'xs';
        case 'code':
          return 'sm';
        case 'quote':
          return 'lg';
        default:
          return size;
      }
    };

    const finalWeight = getVariantWeight();
    const finalSize = getVariantSize();

    return (
      <Text
        ref={ref}
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        className={cn(
          // Base styles
          weightClasses[finalWeight],
          variantClasses[variant],
          sizeClasses[finalSize],
          alignClasses[align],
          
          // Text transformations
          underline && 'underline',
          italic && 'italic',
          strikeThrough && 'line-through',
          uppercase && 'uppercase',
          capitalize && 'capitalize',
          
          // Variant-specific styles
          variant === 'link' && 'underline',
          variant === 'code' && 'px-2 py-1 rounded-xs font-mono',
          variant === 'quote' && 'pl-4 py-2 italic',
          
          className
        )}
        style={style}
        {...props}
      />
    );
  }
);

ThemedText.displayName = 'ThemedText';

// Export the props type for use in other components
export type { ThemedTextProps };

// Pre-composed text components for common use cases
export const DisplayText: React.FC<Omit<ThemedTextProps, 'variant' | 'size'>> = (props) => (
  <ThemedText variant="display" {...props} />
);

export const TitleText: React.FC<Omit<ThemedTextProps, 'variant' | 'size'>> = (props) => (
  <ThemedText variant="title" {...props} />
);

export const HeadingText: React.FC<Omit<ThemedTextProps, 'variant' | 'size'>> = (props) => (
  <ThemedText variant="heading" {...props} />
);

export const SubheadingText: React.FC<Omit<ThemedTextProps, 'variant' | 'size'>> = (props) => (
  <ThemedText variant="subheading" {...props} />
);

export const BodyText: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="default" {...props} />
);

export const LabelText: React.FC<Omit<ThemedTextProps, 'variant' | 'size'>> = (props) => (
  <ThemedText variant="label" {...props} />
);

export const CaptionText: React.FC<Omit<ThemedTextProps, 'variant' | 'size'>> = (props) => (
  <ThemedText variant="caption" {...props} />
);

export const LinkText: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="link" {...props} />
);

export const CodeText: React.FC<Omit<ThemedTextProps, 'variant' | 'size'>> = (props) => (
  <ThemedText variant="code" {...props} />
);

export const QuoteText: React.FC<Omit<ThemedTextProps, 'variant' | 'size'>> = (props) => (
  <ThemedText variant="quote" {...props} />
);

// Status text components
export const SuccessText: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="success" {...props} />
);

export const ErrorText: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="error" {...props} />
);

export const WarningText: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="warning" {...props} />
);

export const BrandText: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="brand" {...props} />
);

export const MutedText: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="muted" {...props} />
);