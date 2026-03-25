import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { setServerSession } from "../../state/servers";
import { selectedServerUrlAtom } from "../../state/store";

type AvailabilityState =
  | "idle"
  | "checking"
  | "available"
  | "configured"
  | "error";

export const Route = createFileRoute("/setup/")({
  component: SetupPage,
});

function SetupPage() {
  const [serverUrl, setServerUrl] = useState("");
  const [availability, setAvailability] = useState<AvailabilityState>("idle");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const setSelectedServerUrl = useSetAtom(selectedServerUrlAtom);
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
      // Песочница: имитируем ответ сервера без fetch.
      await new Promise((r) => setTimeout(r, 500));
      setAvailability(
        /configured/i.test(normalizedUrl) ? "configured" : "available",
      );
    } catch (error) {
      setAvailability("error");
      setSetupError(
        error instanceof Error
          ? error.message
          : "Не удалось проверить доступность setup",
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
      // Песочница: “создаём” root пользователя только для верстки.
      await new Promise((r) => setTimeout(r, 700));
      if (
        !form.login.trim() ||
        !form.password.trim() ||
        !form.fullname.trim()
      ) {
        throw new Error("Заполните login/password/fullname");
      }
      setCreated(true);
    } catch (error) {
      setSetupError(
        error instanceof Error ? error.message : "Ошибка инициализации setup",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function onAddServerToSandbox() {
    const normalizedUrl = serverUrl.trim();
    if (!normalizedUrl) {
      setSetupError("Введите адрес сервера");
      return;
    }

    try {
      const host = new URL(normalizedUrl).hostname;
      // Моки данных создаём только внутри тела компонента/обработчиков.
      setServerSession({
        serverUrl: new URL(normalizedUrl).toString(),
        user: {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `mock-${host}`,
          fullname: `User @ ${host}`,
          login:
            host
              .replace(/[^a-zA-Z0-9]+/g, "_")
              .toLowerCase()
              .slice(0, 24) || "user",
          role: "designer",
        },
      });
      setSelectedServerUrl(new URL(normalizedUrl).toString());
      setSetupError(null);
    } catch (e) {
      setSetupError(e instanceof Error ? e.message : "Неверный URL сервера");
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Первичная настройка сервера</h1>
        <p className="text-sm text-base-content/80">
          Дизайнерская песочница: имитируем UI-логику без сетевых запросов.
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
              {availability === "checking"
                ? "Проверяем..."
                : "Check availability"}
            </button>
          </div>
        </div>
      </div>

      {setupError ? <p className="alert alert-error">{setupError}</p> : null}

      {availability === "configured" ? (
        <div className="alert alert-info">
          Сервер “уже настроен” (песочница). Перейдите к другим макетам.
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
                setForm((current) => ({
                  ...current,
                  login: event.target.value,
                }))
              }
              required
            />
            <input
              className="input input-bordered w-full"
              placeholder="Пароль"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              required
            />
            <input
              className="input input-bordered w-full"
              placeholder="ФИО"
              value={form.fullname}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  fullname: event.target.value,
                }))
              }
              required
            />
            <div className="card-actions justify-end">
              <button
                className="btn btn-success"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Создаем..." : "Инициализировать"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {created ? (
        <div className="alert alert-success flex flex-wrap items-center justify-between gap-3">
          <span>
            Root user “создан” (песочница). Для UI доступна только верстка.
          </span>
          <div className="flex items-center gap-2">
            <span className="badge badge-primary badge-outline">mock</span>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={onAddServerToSandbox}
            >
              Add server to sandbox
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
