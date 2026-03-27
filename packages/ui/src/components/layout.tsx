import React from 'react';
import { cn } from '../utils';

export interface LayoutProps {
  className?: string;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ className, children }) => {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {children}
    </div>
  );
};

export interface HeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ className, children }) => {
  return (
    <header className={cn('sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur', className)}>
      {children}
    </header>
  );
};

export interface MainProps {
  className?: string;
  children: React.ReactNode;
}

export const Main: React.FC<MainProps> = ({ className, children }) => {
  return (
    <main className={cn('flex-1', className)}>
      {children}
    </main>
  );
};

export interface SidebarProps {
  className?: string;
  children: React.ReactNode;
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ className, children, collapsed }) => {
  return (
    <aside
      className={cn(
        'hidden lg:flex lg:flex-shrink-0 transition-all duration-300',
        collapsed ? 'w-20' : 'w-64',
        'border-r border-border bg-background',
        className
      )}
    >
      {children}
    </aside>
  );
};

export interface ContainerProps {
  className?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Container: React.FC<ContainerProps> = ({
  className,
  children,
  maxWidth = 'xl',
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  };

  return (
    <div className={cn('mx-auto px-4 sm:px-6 lg:px-8', maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  );
};

export interface GridProps {
  className?: string;
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg';
}

export const Grid: React.FC<GridProps> = ({
  className,
  children,
  cols = 1,
  gap = 'md',
}) => {
  const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    12: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6',
  };

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };

  return (
    <div className={cn('grid', colsClasses[cols], gapClasses[gap], className)}>
      {children}
    </div>
  );
};
