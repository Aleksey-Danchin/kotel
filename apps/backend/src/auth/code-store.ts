import { Injectable, OnModuleDestroy } from '@nestjs/common';

const CODE_TTL_MS = 60_000;
const CLEANUP_INTERVAL_MS = 60_000;

export type CodeEntry = {
  codeChallenge: string;
  redirectUri: string;
  state: string;
  userId: string;
  clientType: 'WEB' | 'EXPO';
  createdAt: number;
};

@Injectable()
export class CodeStore implements OnModuleDestroy {
  private readonly entries = new Map<string, CodeEntry>();
  private readonly cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, CLEANUP_INTERVAL_MS);
  }

  store(code: string, entry: Omit<CodeEntry, 'createdAt'>): void {
    this.entries.set(code, {
      ...entry,
      createdAt: Date.now(),
    });
  }

  consume(code: string): CodeEntry | null {
    const entry = this.entries.get(code);
    if (!entry) {
      return null;
    }

    this.entries.delete(code);

    if (this.isExpired(entry.createdAt)) {
      return null;
    }

    return entry;
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }

  private cleanupExpired(): void {
    const now = Date.now();

    for (const [code, entry] of this.entries.entries()) {
      if (now - entry.createdAt > CODE_TTL_MS) {
        this.entries.delete(code);
      }
    }
  }

  private isExpired(createdAt: number): boolean {
    return Date.now() - createdAt > CODE_TTL_MS;
  }
}
