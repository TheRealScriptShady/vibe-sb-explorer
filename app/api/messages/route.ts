import { NextRequest, NextResponse } from 'next/server';
import { peekMessages } from '@/lib/service-bus-server';
import { decrypt } from '@/lib/crypto-server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const entityPath = searchParams.get('entityPath');
    const count = parseInt(searchParams.get('count') || '10');
    const fromSeqParam = searchParams.get('fromSequenceNumber');
    const fromSequenceNumber = fromSeqParam ? parseInt(fromSeqParam) : undefined;
    const latest = searchParams.get('latest') === 'true';

    if (!entityPath) {
        return NextResponse.json({ error: 'Entity name (queue/topic) is required' }, { status: 400 });
    }

    let connectionString: string | undefined = undefined;
    const encryptedConnStr = request.headers.get('X-ServiceBus-ConnectionString');

    if (encryptedConnStr) {
        try {
            connectionString = decrypt(encryptedConnStr);
        } catch (e) {
            console.error("Decryption error:", e);
            return NextResponse.json({ error: 'Invalid connection string encryption' }, { status: 400 });
        }
    }

    try {
        const messages = await peekMessages(entityPath, count, fromSequenceNumber, connectionString, latest);
        return NextResponse.json(messages);
    } catch (error: any) {
        console.error("Service Bus Error:", error);
        return NextResponse.json({
            error: 'Failed to fetch messages',
            detail: error.message
        }, { status: 500 });
    }
}
