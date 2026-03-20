import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { usersQueryOptions } from "../queryOptions/users";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

function UsersPage() {
  const usersQuery = useQuery({
    ...usersQueryOptions(),
    enabled: false,
  });

  const users = usersQuery.data ?? [];

  return (
    <main className="p-4 flex flex-col gap-4">
      <button
        className="btn btn-primary w-fit"
        onClick={() => {
          void usersQuery.refetch();
        }}
      >
        загрузить
      </button>

      {usersQuery.isLoading ? (
        <p role="status">Загрузка...</p>
      ) : null}

      {usersQuery.isError ? (
        <p role="alert">
          Ошибка загрузки:{" "}
          {usersQuery.error instanceof Error
            ? usersQuery.error.message
            : "неизвестная ошибка"}
        </p>
      ) : null}

      <table className="table table-zebra">
        <thead>
          <tr>
            <th>id</th>
            <th>fullname</th>
            <th>createdAt</th>
            <th>updatedAt</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.fullname}</td>
              <td>{user.createdAt}</td>
              <td>{user.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
