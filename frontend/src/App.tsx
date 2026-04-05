/**
 * App.tsx — Root component.
 * Wire up your router and pages here.
 * The data layer (hooks, services, providers) is already set up in AppProvider.
 *
 * Quick start example:
 *
 *   import { useWallet } from './hooks/useWallet'
 *   import { usePatient } from './hooks/usePatient'
 *   import { useRecord, useUploadRecord } from './hooks/useRecords'
 *   import { useGrantAccess, useGrants } from './hooks/useAccess'
 *   import { useAuditLog } from './hooks/useAuditLog'
 *   import { RecordCategory, AccessLevel } from './types/health'
 */

import { useWallet } from './hooks/useWallet'
import { useFaceAuth } from './hooks/useFaceAuth'
import { useEncryption } from './providers/EncryptionProvider'
import { FaceAuthGate } from './components/FaceAuthGate'

export default function App() {
  const { isConnected, shortAddress, connect, wrongNetwork, switchNetwork, isConnecting, connectError, expectedChainId, chainId } = useWallet()
  const { isVerified: faceVerified } = useFaceAuth()
  const { isReady: keysReady } = useEncryption()

  const NETWORK_NAMES: Record<number, string> = {
    31337: 'Hardhat Local (localhost:8545)',
    11155111: 'Sepolia Testnet',
    1: 'Ethereum Mainnet',
  }

  if (wrongNetwork) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold">Wrong Network</p>
          <p className="mt-2 text-sm text-gray-500">
            You&apos;re on chain {chainId}. This app requires{' '}
            <strong>{NETWORK_NAMES[expectedChainId] ?? `chain ${expectedChainId}`}</strong>.
          </p>
          <button
            onClick={() => void switchNetwork()}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
          >
            Switch Network
          </button>
          {expectedChainId === 31337 && (
            <p className="mt-3 text-xs text-gray-400">
              Make sure your local Hardhat node is running:{' '}
              <code className="bg-gray-100 px-1 rounded">npx hardhat node</code>
            </p>
          )}
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold">HealthVault</h1>
          <p className="mt-2 text-gray-500">Your decentralized health data, under your control.</p>
          <button
            onClick={() => void connect()}
            disabled={isConnecting}
            className="mt-6 rounded bg-blue-600 px-6 py-3 text-white font-semibold disabled:opacity-50"
          >
            {isConnecting ? 'Connecting…' : 'Connect MetaMask'}
          </button>
          {connectError && (
            <p className="mt-3 text-sm text-red-600">{connectError}</p>
          )}
        </div>
      </div>
    )
  }

  // Wallet connected but 2FA not complete yet — show the face gate.
  // The gate covers: enrollment, verification, recovery, and the brief
  // "unlocking ECIES keys" step after face succeeds.
  if (!faceVerified || !keysReady) {
    return <FaceAuthGate />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">HealthVault</h1>
        <span className="text-sm text-gray-500 font-mono">{shortAddress}</span>
      </header>

      <main className="p-6">
        {/* Your pages go here — replace this placeholder */}
        <p className="text-gray-500">
          Connected. Build your patient/provider UI using the hooks in <code>src/hooks/</code>.
        </p>
      </main>
    </div>
  )
}
