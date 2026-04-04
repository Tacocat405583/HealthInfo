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

import React from 'react'
import { useWallet } from './hooks/useWallet'

export default function App() {
  const { isConnected, shortAddress, connect, wrongNetwork, switchNetwork, isConnecting, connectError } = useWallet()

  if (wrongNetwork) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Wrong network</p>
          <button
            onClick={switchNetwork}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
          >
            Switch Network
          </button>
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
