import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { addServer } from "../api/auth";

interface SetupStatusResponse {
  available: boolean;
}

interface SetupInitResponse {
  ok: boolean;
}

type AvailabilityState = "idle" | "checking" | "available" | "configured" | "error";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

function SetupPage() {
  const [serverUrl, setServerUrl] = useState("");
  const [availability, setAvailability] = useState<AvailabilityState>("idle");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const [form, setForm] = useState({
    login: "",
    password: "",
    fullname: "",
  });

  async function onCheckAvailability() {
    const normalizedUrl = serverUrl.trim();
    if (!normalizedUrl) {
      setSetupError("Введите адрес сервера");
      return;
    }

    setSetupError(null);
    setCreated(false);
    setAvailability("checking");

    try {
      const response = await fetch(`${normalizedUrl}/api/setup/status`);
      if (!response.ok) {
        throw new Error("Проверка доступности завершилась ошибкой");
      }
      const data = (await response.json()) as SetupStatusResponse;
      setAvailability(data.available ? "available" : "configured");
    } catch (error) {
      setAvailability("error");
      setSetupError(
        error instanceof Error ? error.message : "Не удалось проверить доступность setup",
      );
    }
  }

  async function onSubmitSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUrl = serverUrl.trim();
    if (!normalizedUrl) {
      setSetupError("Введите адрес сервера");
      return;
    }

    setIsSubmitting(true);
    setSetupError(null);
    try {
      const response = await fetch(`${normalizedUrl}/api/setup/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        throw new Error("Не удалось создать root пользователя");
      }

      const body = (await response.json()) as SetupInitResponse;
      if (!body.ok) {
        throw new Error("Сервер вернул ошибку инициализации");
      }

      setCreated(true);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Ошибка инициализации setup");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onAddServer() {
    try {
      await addServer(serverUrl.trim());
    } catch (error) {
      setSetupError(
        error instanceof Error ? error.message : "Не удалось добавить сервер после setup",
      );
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Первичная настройка сервера</h1>
        <p className="text-sm text-base-content/80">
          Используйте эту страницу, чтобы создать первого root пользователя.
        </p>
      </header>

      <div className="card bg-base-200 shadow-sm">
        <div className="card-body gap-3">
          <label className="label p-0" htmlFor="setup-server-url">
            <span className="label-text font-medium">Server URL</span>
          </label>
          <input
            id="setup-server-url"
            className="input input-bordered w-full"
            type="url"
            placeholder="https://kotel.localhost"
            value={serverUrl}
            onChange={(event) => setServerUrl(event.target.value)}
          />
          <div className="card-actions justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void onCheckAvailability()}
              disabled={availability === "checking"}
            >
              {availability === "checking" ? "Проверяем..." : "Check availability"}
            </button>
          </div>
        </div>
      </div>

      {setupError ? <p className="alert alert-error">{setupError}</p> : null}

      {availability === "configured" ? (
        <div className="alert alert-info">
          Сервер уже настроен. Перейдите к обычному логину.
        </div>
      ) : null}

      {availability === "available" && !created ? (
        <form className="card bg-base-200 shadow-sm" onSubmit={onSubmitSetup}>
          <div className="card-body gap-3">
            <h2 className="card-title text-base">Создать root пользователя</h2>
            <input
              className="input input-bordered w-full"
              placeholder="Логин"
              value={form.login}
              onChange={(event) =>
                setForm((current) => ({ ...current, login: event.target.value }))
              }
              required
            />
            <input
              className="input input-bordered w-full"
              placeholder="Пароль"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              required
            />
            <input
              className="input input-bordered w-full"
              placeholder="ФИО"
              value={form.fullname}
              onChange={(event) =>
                setForm((current) => ({ ...current, fullname: event.target.value }))
              }
              required
            />
            <div className="card-actions justify-end">
              <button className="btn btn-success" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Создаем..." : "Инициализировать"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {created ? (
        <div className="alert alert-success flex flex-wrap items-center justify-between gap-3">
          <span>Root user создан. Теперь можно добавить сервер.</span>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => void onAddServer()}>
            Add server
          </button>
        </div>
      ) : null}
    </section>
  );
}
