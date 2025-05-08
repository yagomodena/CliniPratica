'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import type React from 'react';

interface PlanCTAButtonProps extends ButtonProps {
  targetId: string; // ID of the section to scroll to
}

export function PlanCTAButton({ targetId, children, ...props }: PlanCTAButtonProps) {

  const handleCTAClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const headerOffset = 80; // Adjust if header height changes
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <Button onClick={handleCTAClick} {...props}>
      {children}
    </Button>
  );
}
