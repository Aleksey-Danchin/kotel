import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { check, signin, signout } from "../api/session";
import { sessionCheckQueryOptions } from "../queryOptions/session";
import { sessionErrorAtom, sessionUserAtom } from "../state/session";

export const Route = createFileRoute("/session-test")({
  component: SessionTestPage,
});

function SessionTestPage() {
  const [sessionUser, setSessionUser] = useAtom(sessionUserAtom);
  const [sessionError, setSessionError] = useAtom(sessionErrorAtom);

  const checkQuery = useQuery({
    ...sessionCheckQueryOptions(),
    enabled: false,
  });

  const signinMutation = useMutation({
    mutationFn: signin,
    onSuccess: (user) => {
      setSessionUser(user);
      setSessionError(null);
    },
    onError: (error) => {
      setSessionError(error instanceof Error ? error.message : "Ошибка signin");
    },
  });

  const signoutMutation = useMutation({
    mutationFn: signout,
    onSuccess: () => {
      setSessionUser(null);
      setSessionError(null);
    },
    onError: (error) => {
      setSessionError(error instanceof Error ? error.message : "Ошибка signout");
    },
  });

  async function handleCheck() {
    const result = await checkQuery.refetch();
    if (result.error) {
      setSessionError(
        result.error instanceof Error ? result.error.message : "Ошибка check",
      );
      return;
    }

    setSessionUser(result.data ?? null);
    setSessionError(null);
  }

  return (
    <main className="p-4 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Session test</h1>

      <div className="flex gap-2">
        <button
          className="btn btn-primary"
          onClick={() => signinMutation.mutate({ login: "user1", password: "123" })}
          disabled={signinMutation.isPending}
        >
          signin
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => signoutMutation.mutate()}
          disabled={signoutMutation.isPending}
        >
          signout
        </button>

        <button
          className="btn btn-accent"
          onClick={() => {
            void handleCheck();
          }}
          disabled={checkQuery.isFetching}
        >
          check
        </button>
      </div>

      {(signinMutation.isPending || signoutMutation.isPending || checkQuery.isFetching) && (
        <p role="status">Запрос выполняется...</p>
      )}

      {sessionError ? (
        <p role="alert">Ошибка: {sessionError}</p>
      ) : null}

      <section className="card bg-base-200 p-4">
        <h2 className="font-medium">Текущее состояние сессии</h2>
        <pre data-testid="session-state" className="whitespace-pre-wrap break-all">
          {JSON.stringify(sessionUser, null, 2)}
        </pre>
      </section>
    </main>
  );
}
