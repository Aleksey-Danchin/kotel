import { ChatMessageBodySkeleton } from "./ChatMessageBodySkeleton";

/** Скелетон колонки чата на время startup-загрузки. */
export function ChatColumnSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-l-2 border-base-content/20 bg-base-100"
      aria-busy="true"
      aria-label="Загрузка чата"
    >
      <header className="shrink-0 border-b border-base-300 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="skeleton h-6 w-40 rounded" aria-hidden="true" />
            <div
              className="skeleton mt-1 h-4 w-32 rounded"
              aria-hidden="true"
            />
          </div>
          <div className="skeleton h-8 w-8 rounded-full" aria-hidden="true" />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <ChatMessageBodySkeleton />
      </div>

      <footer className="shrink-0 border-t border-base-300 bg-base-100 p-3">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1" aria-hidden="true">
            <span className="sr-only">Текст сообщения</span>
            <div className="skeleton h-16 w-full rounded-box" />
          </label>
          <div className="skeleton btn shrink-0" style={{ minWidth: "6rem" }} />
        </form>
      </footer>
    </div>
  );
}

