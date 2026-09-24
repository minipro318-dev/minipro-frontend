import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { DashboardPanel } from '../../components/dashboard'
import { IncidentCard } from '../../components/incidents'
import { FormField, InlineAlert, PrimaryButton, TextInput } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { incidentApi } from '../../services/incident.api'
import type { Incident } from '../../types/incident.types'

export const UserDashboard = () => {
  const { token } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [title, setTitle] = useState('Emergency SOS')
  const [description, setDescription] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadIncidents = useCallback(async () => {
    if (!token) return
    const data = await incidentApi.list(token)
    setIncidents(data.incidents)
  }, [token])

  useEffect(() => {
    const run = async () => {
      try {
        await loadIncidents()
      } catch (apiError) {
        const apiMessage =
          typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
            ? apiError.message
            : 'Could not load incidents.'
        setError(apiMessage)
      }
    }
    void run()
  }, [loadIncidents])

  const onTriggerSos = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    const lat = Number(latitude)
    const lng = Number(longitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be a valid number between -90 and 90.')
      return
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be a valid number between -180 and 180.')
      return
    }

    if (!token) return

    try {
      setLoading(true)
      await incidentApi.triggerSos(token, {
        title: title.trim() || 'Emergency SOS',
        description: description.trim() || undefined,
        latitude: lat,
        longitude: lng,
        address: address.trim() || undefined,
      })
      setMessage('SOS incident created successfully.')
      setDescription('')
      await loadIncidents()
    } catch (apiError) {
      const apiMessage =
        typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
          ? apiError.message
          : 'Failed to create SOS incident.'
      setError(apiMessage)
    } finally {
      setLoading(false)
    }
  }

  const onCancelIncident = async (incidentId: number) => {
    if (!token) return
    setError('')
    setMessage('')
    try {
      await incidentApi.cancel(token, incidentId)
      setMessage(`Incident #${incidentId} cancelled successfully.`)
      await loadIncidents()
    } catch (apiError) {
      const apiMessage =
        typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
          ? apiError.message
          : 'Failed to cancel incident.'
      setError(apiMessage)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPanel
        description="Trigger SOS alerts and track your incidents. Active incidents can be cancelled by you."
        title="End User Dashboard"
      />

      <form className="space-y-4 rounded-xl border border-brand-border bg-brand-dark p-4 shadow-brand-soft" onSubmit={onTriggerSos}>
        <h3 className="text-xl font-semibold text-brand-pink">Trigger SOS</h3>
        <FormField id="title" label="Title">
          <TextInput id="title" onChange={(e) => setTitle(e.target.value)} value={title} />
        </FormField>
        <FormField id="description" label="Description (optional)">
          <TextInput id="description" onChange={(e) => setDescription(e.target.value)} value={description} />
        </FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="latitude" label="Latitude">
            <TextInput id="latitude" onChange={(e) => setLatitude(e.target.value)} placeholder="12.9716" value={latitude} />
          </FormField>
          <FormField id="longitude" label="Longitude">
            <TextInput id="longitude" onChange={(e) => setLongitude(e.target.value)} placeholder="77.5946" value={longitude} />
          </FormField>
        </div>
        <FormField id="address" label="Address (optional)">
          <TextInput id="address" onChange={(e) => setAddress(e.target.value)} placeholder="MG Road, Bengaluru" value={address} />
        </FormField>
        {error ? <InlineAlert message={error} /> : null}
        {message ? <p className="rounded-md border border-emerald-500/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}
        <PrimaryButton disabled={loading} type="submit">
          {loading ? 'Triggering SOS...' : 'Trigger SOS Alert'}
        </PrimaryButton>
      </form>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold text-brand-pink">My Incidents</h3>
        {incidents.length ? (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <IncidentCard
                actionSlot={
                  incident.status === 'ACTIVE' ? (
                    <PrimaryButton className="w-auto px-3 py-1 text-sm" onClick={() => void onCancelIncident(incident.id)} type="button">
                      Cancel Incident
                    </PrimaryButton>
                  ) : null
                }
                incident={incident}
                key={incident.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-muted">No incidents found yet.</p>
        )}
      </section>
    </div>
  )
}
