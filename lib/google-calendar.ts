import { google } from 'googleapis';
import { createAdminClient } from '@/utils/supabase/admin';

// Environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'buidantlabota@gmail.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error('Missing environment variables for Google Calendar Sync');
}

// Initialize OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// --- Helpers ---

/**
 * Get the Google Auth URL for the user to visit
 */
export function getGoogleAuthURL() {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
        prompt: 'consent'
    });
}

/**
 * Exchange code for tokens and save to DB
 */
export async function handleGoogleCallback(code: string) {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('No tokens received from Google');
    }

    const supabase = createAdminClient();
    const { error } = await supabase
        .from('oauth_tokens')
        .upsert({
            provider: 'google',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry: new Date(tokens.expiry_date || Date.now() + 3500 * 1000).toISOString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'provider' });

    if (error) throw error;

    return tokens;
}

/**
 * Get a valid OAuth2 client with fresh tokens
 */
export async function getAuthenticatedGoogleClient() {
    const supabase = createAdminClient();

    // 1. Get tokens from DB
    const { data, error } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('provider', 'google')
        .single();

    if (error || !data) {
        throw new Error('No linked Google account found. Please connect in Integrations.');
    }

    oauth2Client.setCredentials({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: new Date(data.expiry).getTime()
    });

    // 2. Check and Refresh if needed
    const isExpired = Date.now() >= (new Date(data.expiry).getTime() - 60000);

    if (isExpired) {
        console.log('Refreshing Google Access Token...');
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();

            await supabase
                .from('oauth_tokens')
                .update({
                    access_token: credentials.access_token,
                    expiry: new Date(credentials.expiry_date || Date.now() + 3500 * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('provider', 'google');

            oauth2Client.setCredentials(credentials);
        } catch (e) {
            console.error("Error refreshing token:", e);
            throw new Error("Failed to refresh Google Token. Please reconnect.");
        }
    }

    return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Sync a Bolo to Google Calendar
 */
export async function syncBoloToGoogleCalendar(boloId: number) {
    const supabase = createAdminClient();

    // 1. Fetch Bolo
    const { data: bolo, error } = await supabase
        .from('bolos')
        .select('*')
        .eq('id', boloId)
        .single();

    if (error || !bolo) throw new Error(`Bolo #${boloId} not found`);

    const calendar = await getAuthenticatedGoogleClient();

    // 2. LOGIC: DELETE IF NOT CONFIRMED
    if (bolo.estat !== 'Confirmada') {
        if (bolo.google_event_id) {
            console.log(`Google Calendar: event deleted (${bolo.google_event_id})`);
            try {
                await calendar.events.delete({
                    calendarId: CALENDAR_ID,
                    eventId: bolo.google_event_id
                });
            } catch (e: any) {
                if (e.code !== 404) {
                    console.error('Error deleting event:', e);
                }
            }

            // Always clear ID from DB if we intended to delete
            await supabase
                .from('bolos')
                .update({ google_event_id: null })
                .eq('id', boloId);
        } else {
            console.log(`Bolo #${boloId} is not confirmed and has no event. Skipping.`);
        }
        return;
    }

    // 3. LOGIC: CREATE OR UPDATE (STATUS IS CONFIRMED)

    // RE-FETCH to avoid race conditions (duplication)
    const { data: currentBolo, error: fetchError } = await supabase
        .from('bolos')
        .select('*')
        .eq('id', boloId)
        .single();

    if (fetchError || !currentBolo) throw new Error(`Bolo #${boloId} not found during re-fetch`);
    const activeBolo = currentBolo;

    // Format Date and Time
    const [year, month, day] = activeBolo.data_bolo.split('-').map(Number);
    const [hour, min] = (activeBolo.hora_inici || '00:00').split(':').map(Number);
    const startDateObj = new Date(year, month - 1, day, hour, min);

    const durationMinutes = activeBolo.durada || 120;
    const endDateObj = new Date(startDateObj.getTime() + durationMinutes * 60000);

    const getLocalISO = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const formatTimeHM = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // Build Summary
    const rawType = (activeBolo.titol || activeBolo.tipus_actuacio || activeBolo.concepte || activeBolo.nom_poble || 'Actuació');
    const typeStr = rawType.toUpperCase();
    const municipiStr = (activeBolo.nom_poble || '').toUpperCase();
    const timeRange = activeBolo.hora_inici ? ` (${formatTimeHM(startDateObj)} - ${formatTimeHM(endDateObj)})` : '';

    // Format: "BLB - {TYPE} {MUNICIPI} {TIME}"
    // If the type is the same as the city name, don't duplicate
    const eventTitle = typeStr === municipiStr ? typeStr : `${typeStr} ${municipiStr}`;
    const summary = `BLB - ${eventTitle}${timeRange}`;

    // Build Description
    const description = [
        `🥁🎷🎺🎤🍷🇧🇷🥳🥾`,
        ``,
        `🎉 *${activeBolo.titol || activeBolo.nom_poble}*`,
        `📅 *Data:* ${activeBolo.data_bolo}`,
        `⏰ *Inici:* ${(activeBolo.hora_inici || '').substring(0, 5)} h`,
        `🕒 *Convocatòria:* ${(activeBolo.hora_convocatoria || '').substring(0, 5) || 'XX:XX'} h`,
        ``,
        `📒 *CONCEPTE*`,
        `${activeBolo.concepte || 'Cercavila'}`,
        ``,
        `*❗️CONVOCATÒRIA❗️*`,
        `🕒 *${(activeBolo.hora_convocatoria || '').substring(0, 5) || (activeBolo.hora_inici || '').substring(0, 5)}* (Hora de quedada)`,
        `🏟️ *LLOC:* ${activeBolo.ubicacio_inici || 'Per confirmar'}${activeBolo.maps_inici ? ` (${activeBolo.maps_inici})` : ''}`,
        `🧳 *FUNDES:* ${activeBolo.notes_fundes || 'Per confirmar'}${activeBolo.maps_fundes ? ` (${activeBolo.maps_fundes})` : ''}`,
        `🅿️ *APARCAMENT:* ${activeBolo.ubicacio_aparcament || 'Per confirmar'}${activeBolo.maps_aparcament ? ` (${activeBolo.maps_aparcament})` : ''}`,
        ``,
        `📝 *Notes:* ${activeBolo.notes || 'Cap nota addicional'}`,
        ``,
        `*A Buidar-la fortíssim*🍷🍷🥳🇧🇷🥾`
    ].join('\n');

    const resource = {
        summary,
        description,
        location: bolo.ubicacio_detallada || bolo.nom_poble,
        colorId: '6', // Tangerine (Orange)
        start: {
            dateTime: getLocalISO(startDateObj),
            timeZone: 'Europe/Madrid',
        },
        end: {
            dateTime: getLocalISO(endDateObj),
            timeZone: 'Europe/Madrid'
        },
    };

    if (bolo.google_event_id) {
        // UPDATE
        try {
            await calendar.events.update({
                calendarId: CALENDAR_ID,
                eventId: bolo.google_event_id,
                requestBody: resource,
            });
            console.log('Google Calendar: event updated');
        } catch (e: any) {
            if (e.code === 404) {
                console.warn('Google Calendar: event 404 on update, recreating...');
                const res = await calendar.events.insert({
                    calendarId: CALENDAR_ID,
                    requestBody: resource,
                });
                if (res.data.id) {
                    await supabase
                        .from('bolos')
                        .update({ google_event_id: res.data.id })
                        .eq('id', boloId);
                    console.log('Google Calendar: event recreated');
                }
            } else {
                throw e;
            }
        }
    } else {
        // CREATE
        try {
            const res = await calendar.events.insert({
                calendarId: CALENDAR_ID,
                requestBody: resource,
            });

            if (res.data.id) {
                await supabase
                    .from('bolos')
                    .update({ google_event_id: res.data.id })
                    .eq('id', boloId);
                console.log('Google Calendar: event created');
            }
        } catch (e) {
            console.error('Error creating event:', e);
            throw e;
        }
    }
}
