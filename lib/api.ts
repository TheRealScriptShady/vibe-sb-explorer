export interface Message {
  messageId: string;
  sequenceNumber: number;
  enqueuedTime: string;
  subject: string;
  correlationId: string;
  body: string;
  applicationProperties: Record<string, any>;
}

// --- RSA-OAEP Encryption using Web Crypto API ---

let cachedPublicKey: string | null = null;
let cachedCryptoKey: CryptoKey | null = null;

export async function fetchPublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const response = await fetch(`${baseUrl}/api/auth/public-key`);
  if (!response.ok) {
    throw new Error("Failed to fetch public key");
  }
  const data = await response.json();
  cachedPublicKey = data.publicKey;
  return data.publicKey;
}

/** Convert PEM public key to a Web Crypto CryptoKey */
async function importPublicKey(pem: string): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;

  // Remove PEM header/footer and decode base64
  const pemBody = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'spki',
    binaryDer.buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt']
  );

  cachedCryptoKey = key;
  return key;
}

/** Encrypt a string using RSA-OAEP and return base64 */
async function encryptWithPublicKey(plainText: string, pemPublicKey: string): Promise<string> {
  const key = await importPublicKey(pemPublicKey);
  const encoded = new TextEncoder().encode(plainText);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    encoded
  );

  // Convert ArrayBuffer to base64
  const bytes = new Uint8Array(encrypted);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// --- API Functions ---

async function getEncryptedHeader(connectionString: string): Promise<Record<string, string>> {
  const publicKey = await fetchPublicKey();
  const encrypted = await encryptWithPublicKey(connectionString, publicKey);
  return { "X-ServiceBus-ConnectionString": encrypted };
}

export async function fetchMessages(
  entityPath: string,
  count: number = 10,
  fromSequenceNumber?: number,
  connectionString?: string,
  latest?: boolean
): Promise<Message[]> {
  const params = new URLSearchParams({
    entityPath,
    count: count.toString(),
  });

  if (fromSequenceNumber !== undefined) {
    params.append('fromSequenceNumber', fromSequenceNumber.toString());
  }

  if (latest) {
    params.append('latest', 'true');
  }

  let headers: HeadersInit = {};
  if (connectionString) {
    try {
      headers = await getEncryptedHeader(connectionString);
    } catch (e) {
      console.error("Encryption error:", e);
      throw new Error("Failed to encrypt connection string.");
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const response = await fetch(`${baseUrl}/api/messages?${params.toString()}`, {
    headers: headers
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch (e) {
      // Ignore JSON parse error
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchQueueCount(queueName: string, connectionString?: string): Promise<{ count: number | string }> {
  let headers: HeadersInit = {};
  if (connectionString) {
    try {
      headers = await getEncryptedHeader(connectionString);
    } catch (e) {
      console.error("Encryption error:", e);
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const response = await fetch(`${baseUrl}/api/queues/${queueName}/count`, {
    headers: headers
  });

  if (!response.ok) {
    return { count: "N/A" };
  }
  return response.json();
}
