/** Скелетон содержимого колонки "Чаты". */
export function ChatsColumnBodySkeleton() {
  return (
    <div className="flex flex-col gap-2 p-1" aria-busy="true" aria-label="Загрузка списка чатов">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="skeleton rounded-box h-20 w-full"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

