'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Create the "librarian's brain"
const queryClient = new QueryClient();

// This component will wrap our entire app
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}