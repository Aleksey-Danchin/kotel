import clsx from "clsx";

/** Скелетон области сообщений при имитации загрузки при смене сервера/чата. */
export function ChatMessageBodySkeleton() {
  return (
    <div
      className="flex flex-col gap-3"
      aria-busy="true"
      aria-label="Загрузка сообщений"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className={clsx("flex w-full", i % 2 === 0 ? "justify-start" : "justify-end")}
        >
          <div
            className={clsx(
              "skeleton rounded-box",
              i % 2 === 0 ? "h-16 w-[min(100%,20rem)]" : "h-12 w-[min(100%,16rem)]",
            )}
          />
        </div>
      ))}
    </div>
  );
}
