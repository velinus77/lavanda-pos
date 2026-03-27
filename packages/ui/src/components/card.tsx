import React from 'react';
import { cn } from '../utils';

export interface CardProps {
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  className,
  children,
  variant = 'default',
  padding = 'md',
}) => {
  const variantClasses = {
    default: 'bg-card border border-border',
    elevated: 'bg-card shadow-xl shadow-black/5',
    outlined: 'bg-card border-2 border-border',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-200',
        variantClasses[variant],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ className, children }) => {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
};

export interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ className, children }) => {
  return (
    <h3 className={cn('text-xl font-semibold text-foreground', className)}>
      {children}
    </h3>
  );
};

export interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ className, children }) => {
  return <div className={cn('text-muted-foreground', className)}>{children}</div>;
};
