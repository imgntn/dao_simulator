'use client';

import { ReactNode } from 'react';
import { TooltipSettingsProvider } from '@/lib/contexts/TooltipSettingsContext';
import { AppSettingsProvider } from '@/lib/contexts/AppSettingsContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppSettingsProvider>
      <TooltipSettingsProvider>
        {children}
      </TooltipSettingsProvider>
    </AppSettingsProvider>
  );
}
