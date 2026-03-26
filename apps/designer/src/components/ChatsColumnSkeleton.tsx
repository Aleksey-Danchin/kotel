import { ColumnHeaderGear } from "./ColumnHeaderGear";
import { ChatsColumnBodySkeleton } from "./ChatsColumnBodySkeleton";

/** Скелетон колонки "Чаты" на время startup-загрузки. */
export function ChatsColumnSkeleton() {
  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col bg-base-200 p-1"
      aria-busy="true"
      aria-label="Загрузка чатов"
    >
      <header className="shrink-0 min-h-16 border-b border-base-300 px-2">
        <div className="flex h-full items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="skeleton h-4 w-24 rounded" />
          </div>
          <div className="opacity-0 pointer-events-none">
            <ColumnHeaderGear />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ChatsColumnBodySkeleton />
      </div>

      <footer
        className="shrink-0 min-h-10 border-t border-base-300"
        aria-hidden="true"
      />
    </aside>
  );
}

