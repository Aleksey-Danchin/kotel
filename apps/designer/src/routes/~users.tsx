import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

function UsersPage() {
  const users = [
    {
      id: "user_1",
      fullname: "User One",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
    },
    {
      id: "user_2",
      fullname: "User Two",
      createdAt: "2026-01-15T00:00:00Z",
      updatedAt: "2026-02-10T00:00:00Z",
    },
  ];

  return (
    <main className="p-4 flex flex-col gap-4">
      <div className="alert alert-info">
        Страница “users” в песочнице: данные статические, без запросов к backend.
      </div>

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
