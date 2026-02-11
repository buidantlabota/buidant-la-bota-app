import { syncBoloToGoogleCalendar } from '@/lib/google-calendar';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    try {
        await syncBoloToGoogleCalendar(id);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(`Error syncing bolo ${id}:`, e);
        return NextResponse.json({ error: e.message || 'Sync failed' }, { status: 500 });
    }
}
