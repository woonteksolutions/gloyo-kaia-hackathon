import React from 'react';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileLayout({ 
  children, 
  className = ""
}: MobileLayoutProps) {
  return (
    <div className="mobile-page">
      <div className={`mobile-container mobile-safe ${className}`}>
        {children}
      </div>
    </div>
  );
}

interface MobilePageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

export function MobilePageHeader({ icon, title, subtitle, className = "" }: MobilePageHeaderProps) {
  return (
    <div className={`text-center space-y-3 ${className}`}>
      <div className="mobile-icon-primary mx-auto">
        {icon}
      </div>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-2 text-base">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

interface MobileContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileContent({ children, className = "" }: MobileContentProps) {
  return (
    <div className={`mobile-content ${className}`}>
      {children}
    </div>
  );
}

export function MobileSection({ children, className = "" }: MobileContentProps) {
  return (
    <div className={`mobile-section ${className}`}>
      {children}
    </div>
  );
}