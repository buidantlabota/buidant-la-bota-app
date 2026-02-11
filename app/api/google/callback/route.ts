import { handleGoogleCallback } from '@/lib/google-calendar';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return new Response(`Google Auth Error: ${error}`, { status: 400 });
    }

    if (!code) {
        return new Response('No code provided', { status: 400 });
    }

    try {
        await handleGoogleCallback(code);
    } catch (e: any) {
        console.error(e);
        return new Response(`Error connecting: ${e.message}`, { status: 500 });
    }

    // Redirect to integrations page with success param
    redirect('/integracions?connected=true');
}
