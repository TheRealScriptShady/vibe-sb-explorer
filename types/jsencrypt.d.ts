declare module 'jsencrypt' {
    export class JSEncrypt {
        constructor(options?: any);
        setPublicKey(publicKey: string): void;
        setPrivateKey(privateKey: string): void;
        encrypt(str: string): string | false;
        decrypt(str: string): string | false;
    }
}
