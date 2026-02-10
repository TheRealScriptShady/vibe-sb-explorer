import { NextRequest, NextResponse } from 'next/server';
import { getQueueCount } from '@/lib/service-bus-server';
import { decrypt } from '@/lib/crypto-server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> }
) {
    const { name: queueName } = await params;

    if (!queueName) {
        return NextResponse.json({ error: 'Queue name is required' }, { status: 400 });
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
        const count = await getQueueCount(queueName, connectionString);
        if (count === -1) {
            return NextResponse.json({ count: "N/A" });
        }
        return NextResponse.json({ count });
    } catch (error: any) {
        console.error("Service Bus Count Error:", error);
        return NextResponse.json({ count: "N/A" });
    }
}
