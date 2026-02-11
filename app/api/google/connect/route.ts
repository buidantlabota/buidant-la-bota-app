import { getGoogleAuthURL } from '@/lib/google-calendar';
import { redirect } from 'next/navigation';

export async function GET() {
    const url = getGoogleAuthURL();
    redirect(url);
}
