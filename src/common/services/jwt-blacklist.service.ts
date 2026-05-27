import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";

@Injectable()
export class JwtBlacklistService {
  private readonly invalidatedTokens = new Map<string, number>();

  invalidate(token: string, exp?: number) {
    const expiresAt = exp && Number.isFinite(exp)
      ? exp * 1000
      : Date.now() + 24 * 60 * 60 * 1000;

    this.prune();
    this.invalidatedTokens.set(this.hash(token), expiresAt);
  }

  isInvalidated(token: string) {
    this.prune();
    return this.invalidatedTokens.has(this.hash(token));
  }

  private prune() {
    const now = Date.now();
    for (const [hash, expiresAt] of this.invalidatedTokens.entries()) {
      if (expiresAt <= now) {
        this.invalidatedTokens.delete(hash);
      }
    }
  }

  private hash(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
