import { NextResponse } from 'next/server';
import { getPublicKey } from '@/lib/crypto-server';

export async function GET() {
    try {
        const publicKey = getPublicKey();
        return NextResponse.json({ publicKey });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
