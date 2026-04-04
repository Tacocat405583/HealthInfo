/**
 * AppProvider.tsx
 *
 * Composes all global providers in the correct order.
 * Wrap your entire app with this.
 *
 * Usage in main.tsx:
 *   <AppProvider>
 *     <App />
 *   </AppProvider>
 */

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Web3Provider } from './Web3Provider'
import { EncryptionProvider } from './EncryptionProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30 seconds
      gcTime: 5 * 60 * 1000,   // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <EncryptionProvider>
          {children}
        </EncryptionProvider>
      </Web3Provider>
    </QueryClientProvider>
  )
}
