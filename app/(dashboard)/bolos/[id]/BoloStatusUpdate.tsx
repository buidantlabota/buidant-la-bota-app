'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { BoloStatus } from '@/types'

interface BoloStatusUpdateProps {
    id: number
    currentStatus: BoloStatus
}

export function BoloStatusUpdate({ id, currentStatus }: BoloStatusUpdateProps) {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    const updateStatus = async (newStatus: BoloStatus) => {
        if (newStatus === currentStatus) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('bolos')
                .update({ estat: newStatus })
                .eq('id', id)

            if (error) throw error

            // Trigger Google Calendar Sync if relevant
            if (newStatus === 'Confirmada' || currentStatus === 'Confirmada') {
                // Background sync (don't await for UI)
                fetch(`/api/bolos/${id}/sync`, { method: 'POST' })
                    .then(async (res) => {
                        if (!res.ok) {
                            const err = await res.json();
                            alert(`Bolo actualitzat, però ERROR Sincronització Calendari: ${err.error || 'Desconegut'}`);
                        } else {
                            console.log('Calendari sincronitzat');
                        }
                    })
                    .catch(e => console.error('Error xarxa sync:', e));
            }

            router.refresh()
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Error al actualitzar l\'estat')
        } finally {
            setLoading(false)
        }
    }

    const statuses: BoloStatus[] = ['Nova', 'Pendent de confirmació', 'Confirmada', 'Pendents de cobrar', 'Per pagar', 'Tancades', 'Cancel·lats']

    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-neutral-400 mb-2">Canviar estat a:</div>
            <div className="grid gap-2">
                {statuses.map((status) => (
                    <Button
                        key={status}
                        variant={status === currentStatus ? "secondary" : "outline"}
                        size="sm"
                        className="w-full justify-start"
                        disabled={loading || status === currentStatus}
                        onClick={() => updateStatus(status)}
                    >
                        {status}
                    </Button>
                ))}
            </div>
        </div>
    )
}
