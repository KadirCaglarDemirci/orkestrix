import CryptoJS from "crypto-js";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

export class CredentialService {
  private readonly key = env.ENCRYPTION_KEY;

  encrypt(data: Record<string, string>): string {
    const json = JSON.stringify(data);
    return CryptoJS.AES.encrypt(json, this.key).toString();
  }

  decrypt(encryptedData: string): Record<string, string> {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.key);
    const json = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(json);
  }

  async getDecrypted(credentialId: string): Promise<Record<string, string>> {
    const credential = await prisma.credential.findUniqueOrThrow({
      where: { id: credentialId },
    });
    return this.decrypt(credential.encryptedData);
  }
}

export const credentialService = new CredentialService();
