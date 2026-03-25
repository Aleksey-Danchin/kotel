import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  // Песочница: реальную OAuth-обработку отключаем, чтобы не тянуть бизнес-логику.
  const postedRef = useRef(false);

  useEffect(() => {
    // Сделано намеренно: просто “поглощаем” повторные рендеры, никакие сообщения наружу не отправляем.
    if (postedRef.current) return;
    postedRef.current = true;
  }, []);

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const code = params.get("code");
  const state = params.get("state");

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">OAuth callback (designer)</h1>
      <p className="text-sm text-base-content/80">
        В песочнице обработка OAuth отключена. Здесь показываем только входящие параметры для верстки.
      </p>
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body gap-2">
          <div className="text-sm">
            <span className="font-medium">code:</span> {code ?? "—"}
          </div>
          <div className="text-sm">
            <span className="font-medium">state:</span> {state ?? "—"}
          </div>
        </div>
      </div>
      <div className="alert alert-info">
        Вернитесь на главную или откройте другие страницы для макетов.
      </div>
    </section>
  );
}
