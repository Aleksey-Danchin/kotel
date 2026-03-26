import { ColumnHeaderGear } from "./ColumnHeaderGear";

/** Скелетон колонки "Сервера" на время startup-загрузки. */
export function ServicesColumnSkeleton() {
  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col border-r border-base-200 bg-base-300 p-1"
      aria-busy="true"
      aria-label="Загрузка серверов"
    >
      <header className="shrink-0 min-h-16 border-b border-base-200 px-2">
        <div className="flex h-full items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="skeleton h-4 w-24 rounded" />
          </div>
          {/* Keep existing gear for layout parity, but hide it visually while loading. */}
          <div className="opacity-0 pointer-events-none">
            <ColumnHeaderGear />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="skeleton rounded-box h-20 w-full"
            aria-hidden="true"
          />
        ))}
      </div>

      <footer className="shrink-0 pt-2 pb-2">
        <div className="skeleton h-10 w-full rounded-box" aria-hidden="true" />
      </footer>
    </aside>
  );
}

