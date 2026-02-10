import { ServiceBusClient, ServiceBusReceivedMessage, ServiceBusAdministrationClient } from "@azure/service-bus";
import { DefaultAzureCredential } from "@azure/identity";
import Long from "long";

// Types matching frontend
export interface Message {
    messageId: string;
    sequenceNumber: number;
    enqueuedTime: string;
    subject: string;
    correlationId: string;
    body: string;
    applicationProperties: Record<string, any>;
}

// Global variable for default client to survive HMR in dev
const globalForServiceBus = global as unknown as { serviceBusClient: ServiceBusClient | undefined };

function getClient(connectionString?: string): ServiceBusClient {
    if (connectionString) {
        return new ServiceBusClient(connectionString);
    }

    if (!globalForServiceBus.serviceBusClient) {
        const envConnStr = process.env.SERVICE_BUS_CONNECTION_STRING || process.env.ConnectionStrings__ServiceBusConnection;
        if (envConnStr) {
            globalForServiceBus.serviceBusClient = new ServiceBusClient(envConnStr);
        } else {
            const namespace = process.env.SERVICE_BUS_NAMESPACE;
            if (namespace) {
                globalForServiceBus.serviceBusClient = new ServiceBusClient(namespace, new DefaultAzureCredential());
            } else {
                throw new Error("No Service Bus configuration found. Set SERVICE_BUS_CONNECTION_STRING, ConnectionStrings__ServiceBusConnection, or SERVICE_BUS_NAMESPACE.");
            }
        }
    }
    return globalForServiceBus.serviceBusClient!;
}

function getAdminClient(connectionString?: string): ServiceBusAdministrationClient {
    if (connectionString) {
        return new ServiceBusAdministrationClient(connectionString);
    }

    const envConnStr = process.env.SERVICE_BUS_CONNECTION_STRING || process.env.ConnectionStrings__ServiceBusConnection;
    if (envConnStr) {
        return new ServiceBusAdministrationClient(envConnStr);
    }

    const namespace = process.env.SERVICE_BUS_NAMESPACE;
    if (namespace) {
        return new ServiceBusAdministrationClient(namespace, new DefaultAzureCredential());
    }

    throw new Error("No Service Bus configuration found for Admin Client.");
}

function mapMessage(m: ServiceBusReceivedMessage): Message {
    const seqNum = m.sequenceNumber;
    const seqNumValue = seqNum ? (typeof seqNum === 'number' ? seqNum : seqNum.toNumber()) : 0;

    return {
        messageId: (m.messageId as string) || "",
        sequenceNumber: seqNumValue,
        enqueuedTime: m.enqueuedTimeUtc ? m.enqueuedTimeUtc.toISOString() : new Date().toISOString(),
        subject: m.subject || "",
        correlationId: (m.correlationId as string) || "",
        body: typeof m.body === 'string' ? m.body : JSON.stringify(m.body ?? ""),
        applicationProperties: (m.applicationProperties as Record<string, any>) || {}
    };
}

export async function peekMessages(
    queueName: string,
    count: number = 10,
    fromSequenceNumber?: number,
    connectionString?: string,
    latest: boolean = false
): Promise<Message[]> {
    const client = getClient(connectionString);
    const receiver = client.createReceiver(queueName);

    try {
        let messages: ServiceBusReceivedMessage[] = [];

        if (latest) {
            const limit = 5000;
            const batchSize = Math.min(count, 100);

            let currentBatch = await receiver.peekMessages(batchSize);
            const allMessages: ServiceBusReceivedMessage[] = [];

            while (currentBatch.length > 0 && allMessages.length < limit) {
                allMessages.push(...currentBatch);
                const lastMsg = currentBatch[currentBatch.length - 1];
                const lastSeq = lastMsg.sequenceNumber;
                if (!lastSeq) break;

                // Long.add(1) to get next sequence number
                const nextSeq = typeof lastSeq === 'number'
                    ? Long.fromNumber(lastSeq + 1)
                    : lastSeq.add(1);

                currentBatch = await receiver.peekMessages(batchSize, { fromSequenceNumber: nextSeq });
            }

            // Sort descending by sequenceNumber
            allMessages.sort((a, b) => {
                const aSeq = a.sequenceNumber ? (typeof a.sequenceNumber === 'number' ? a.sequenceNumber : a.sequenceNumber.toNumber()) : 0;
                const bSeq = b.sequenceNumber ? (typeof b.sequenceNumber === 'number' ? b.sequenceNumber : b.sequenceNumber.toNumber()) : 0;
                return bSeq - aSeq;
            });

            messages = allMessages.slice(0, count);

        } else {
            const options = fromSequenceNumber !== undefined
                ? { fromSequenceNumber: Long.fromNumber(fromSequenceNumber) }
                : undefined;
            messages = await receiver.peekMessages(count, options);
        }

        return messages.map(mapMessage);

    } finally {
        await receiver.close();
        if (connectionString) {
            await client.close();
        }
    }
}

export async function getQueueCount(queueName: string, connectionString?: string): Promise<number> {
    const client = getAdminClient(connectionString);
    try {
        const properties = await client.getQueueRuntimeProperties(queueName);
        return properties.activeMessageCount;
    } catch (e) {
        console.error("Error fetching queue count:", e);
        return -1;
    }
}
