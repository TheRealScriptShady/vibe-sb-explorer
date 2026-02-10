import { generateKeyPairSync, privateDecrypt, constants } from 'crypto';

// Singleton state
let privateKey: string | null = null;
let publicKey: string | null = null;

// Generate keys if not already generated
function ensureKeys() {
    if (privateKey && publicKey) return;

    console.log("Generating RSA Key Pair...");
    const keyPair = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;
}

export function getPublicKey(): string {
    ensureKeys();
    return publicKey!;
}

export function decrypt(encryptedBase64: string): string {
    ensureKeys();
    try {
        const buffer = Buffer.from(encryptedBase64, 'base64');
        const decrypted = privateDecrypt(
            {
                key: privateKey!,
                padding: constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            buffer
        );
        return decrypted.toString('utf8');
    } catch (error) {
        console.error("Decryption failed:", error);
        throw new Error("Decryption failed");
    }
}
