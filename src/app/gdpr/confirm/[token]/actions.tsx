'use client'

import { useState } from 'react'
import { Trash2, Loader2, CheckCircle } from 'lucide-react'

export function GdprActions({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'confirming' | 'loading' | 'done' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleDelete() {
    if (state === 'idle') {
      // First click: show confirmation
      setState('confirming')
      return
    }

    if (state === 'confirming') {
      // Second click: execute deletion
      setState('loading')
      try {
        const res = await fetch('/api/gdpr/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data = await res.json()

        if (!res.ok) {
          setErrorMessage(data.error || 'Ein Fehler ist aufgetreten.')
          setState('error')
          return
        }

        setState('done')
      } catch {
        setErrorMessage('Ein Netzwerkfehler ist aufgetreten. Bitte versuchen Sie es erneut.')
        setState('error')
      }
    }
  }

  if (state === 'done') {
    return (
      <div className="text-center py-6">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <p className="text-lg font-semibold text-gray-900">Ihre Daten wurden gelöscht.</p>
        <p className="text-sm text-gray-500 mt-1">
          Alle personenbezogenen Daten wurden endgültig entfernt.
        </p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700 text-sm">{errorMessage}</p>
        </div>
        <button
          onClick={() => { setState('idle'); setErrorMessage('') }}
          className="w-full py-3 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {state === 'confirming' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700 text-sm font-medium">
            Sind Sie sicher? Klicken Sie erneut, um die Löschung endgültig zu bestätigen.
          </p>
        </div>
      )}

      <button
        onClick={handleDelete}
        disabled={state === 'loading'}
        className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg transition-colors font-medium ${
          state === 'confirming'
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-red-100 text-red-700 hover:bg-red-200'
        }`}
      >
        {state === 'loading' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Trash2 className="h-5 w-5" />
        )}
        {state === 'confirming'
          ? 'Endgültig löschen'
          : state === 'loading'
            ? 'Wird gelöscht...'
            : 'Daten löschen'}
      </button>

      {state === 'confirming' && (
        <button
          onClick={() => setState('idle')}
          className="w-full py-3 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Abbrechen
        </button>
      )}
    </div>
  )
}
