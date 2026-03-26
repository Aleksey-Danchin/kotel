export const DESIGNER_CHAT_COMPOSER_MAX_CHARS = 1024;
export const DESIGNER_CHAT_COMPOSER_COUNTER_THRESHOLD = 50;

export function clampComposerText(text: string): string {
  return text.slice(0, DESIGNER_CHAT_COMPOSER_MAX_CHARS);
}

export function remainingComposerChars(text: string): number {
  return DESIGNER_CHAT_COMPOSER_MAX_CHARS - text.length;
}

export function shouldShowComposerCounter(remaining: number): boolean {
  return remaining <= DESIGNER_CHAT_COMPOSER_COUNTER_THRESHOLD;
}
