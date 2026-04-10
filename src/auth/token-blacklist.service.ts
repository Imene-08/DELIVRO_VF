import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenBlacklistService {
  private readonly blacklist = new Map<string, number>(); // token → expiry timestamp (ms)

  add(token: string, expiresAt: number): void {
    this.cleanup();
    this.blacklist.set(token, expiresAt);
  }

  has(token: string): boolean {
    const expiry = this.blacklist.get(token);
    if (expiry === undefined) return false;
    if (Date.now() > expiry) {
      this.blacklist.delete(token);
      return false;
    }
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [token, expiry] of this.blacklist.entries()) {
      if (now > expiry) {
        this.blacklist.delete(token);
      }
    }
  }
}
