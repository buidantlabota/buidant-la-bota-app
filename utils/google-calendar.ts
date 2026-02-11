
import { createAdminClient } from "@/utils/supabase/admin";
import { addHours, parseISO, formatISO } from "date-fns";
import { Bolo } from "@/types";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

// --- Auth Helpers ---

export const getGoogleAuthUrl = () => {
    const scopes = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
    ];

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent' // Force refresh token
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const exchangeCodeForTokens = async (code: string) => {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || 'Failed to exchange code');

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + data.expires_in);

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token, // Only provided on first consent or prompt=consent
        expiry: expiryDate.toISOString()
    };
};

export const getValidAccessToken = async () => {
    const supabase = createAdminClient();

    const { data: tokenData, error } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('provider', 'google')
        .single();

    if (error || !tokenData) throw new Error('No Google Calendar connection found.');

    const now = new Date();
    const expiry = new Date(tokenData.expiry);

    // Refresh if expired or expiring in < 5 mins
    if (expiry.getTime() - now.getTime() < 5 * 60 * 1000) {
        if (!tokenData.refresh_token) throw new Error('No refresh token available. Reconnect Google Calendar.');

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: tokenData.refresh_token,
                grant_type: 'refresh_token'
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error_description || 'Failed to refresh token');

        // Update DB
        const newExpiry = new Date();
        newExpiry.setSeconds(newExpiry.getSeconds() + data.expires_in);

        await supabase.from('oauth_tokens').update({
            access_token: data.access_token,
            expiry: newExpiry.toISOString(),
            updated_at: new Date().toISOString()
        }).eq('provider', 'google');

        return data.access_token;
    }

    return tokenData.access_token;
};

// --- Sync Logic ---

export const syncBoloToCalendar = async (boloId: string | number) => {
    const supabase = createAdminClient();

    // 1. Fetch Bolo with Client
    const { data: bolo, error } = await supabase
        .from('bolos')
        .select(`*, client:clients(nom)`)
        .eq('id', boloId)
        .single();

    if (error || !bolo) throw new Error(`Bolo ${boloId} not found.`);

    // 2. Get Valid Token
    const accessToken = await getValidAccessToken();

    // 3. Construct Event Data
    let summary = `BLB - ${bolo.nom_poble}`;
    if (bolo.concepte) summary += ` (${bolo.concepte})`;

    // If canceled/rejected but still in system (not deleted), mark title
    const isConfirmed = bolo.estat === 'Confirmada';
    if (!isConfirmed) {
        summary = `[${bolo.estat.toUpperCase()}] ${summary}`;
    }

    // Default duration: 2 hours if not specified
    const startTimeStr = `${bolo.data_bolo.split('T')[0]}T${bolo.hora_inici || '12:00'}:00`; // Assume HH:MM format
    // Simple handling: if only HH:MM provided.
    // Ideally parse input format rigorously.

    let startDateTime = startTimeStr;
    // Check if `data_bolo` already includes time? Usually YYYY-MM-DD.
    // If `hora_inici` is HH:MM.
    // Combine robustly.

    // Safety check for invalid time
    if (!bolo.hora_inici) startDateTime = `${bolo.data_bolo.split('T')[0]}T00:00:00`;

    const startDate = parseISO(startDateTime);
    const endDate = bolo.durada ? new Date(startDate.getTime() + bolo.durada * 60000) : addHours(startDate, 2);

    const eventBody = {
        summary: summary,
        location: `${bolo.nom_poble} ${bolo.ubicacio_detallada || ''}`.trim(),
        description: `Notes: ${bolo.notes || 'Cap'}\nClient: ${bolo.client?.nom || 'N/D'}\nEstat: ${bolo.estat}`,
        start: {
            dateTime: formatISO(startDate),
            timeZone: 'Europe/Madrid'
        },
        end: {
            dateTime: formatISO(endDate),
            timeZone: 'Europe/Madrid'
        }
    };

    // 4. Create or Update
    let eventId = bolo.google_event_id;
    let method = 'POST';
    let url = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`;

    if (eventId) {
        // Check if exists first? Or just try PUT.
        // PUT requires eventId in URL
        method = 'PUT';
        url = `${url}/${eventId}`;
    }

    let response = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody)
    });

    // Handle 404 (Event deleted in Calendar but ID exists in DB) -> Recreate
    if (response.status === 404 && eventId) {
        console.warn(`Event ${eventId} not found in Calendar. Recreating...`);
        // Switch to POST (Create)
        method = 'POST';
        url = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`;
        // Remove ID from body if any (we didn't put it)
        response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventBody)
        });
    }

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(`Google Calendar API Error: ${JSON.stringify(errData)}`);
    }

    const eventData = await response.json();
    const newEventId = eventData.id;

    // 5. Update DB if ID changed or was null
    if (newEventId !== bolo.google_event_id) {
        await supabase
            .from('bolos')
            .update({ google_event_id: newEventId })
            .eq('id', boloId);
    }

    return { status: 'synced', eventId: newEventId };
};
