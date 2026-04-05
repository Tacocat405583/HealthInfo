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
import { FaceAuthProvider } from './FaceAuthProvider'
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

/**
 * Provider stack order matters:
 *   QueryClient > Web3 > FaceAuth > Encryption
 *
 * FaceAuth sits between Web3 and Encryption because it needs the signer
 * (to derive the AES key that encrypts the face descriptor) AND must gate
 * the ECIES key initialization — EncryptionProvider.initKeys() refuses to
 * run until useFaceAuth().isVerified === true.
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <FaceAuthProvider>
          <EncryptionProvider>
            {children}
          </EncryptionProvider>
        </FaceAuthProvider>
      </Web3Provider>
    </QueryClientProvider>
  )
}
