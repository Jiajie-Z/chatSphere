export default function UserList({ users, currentUser }) {
  const onlineUsers = Object.values(users);

  return (
    <ul className="users">
      {onlineUsers.length === 0 ? (
        <li className="users__empty">No one is online yet.</li>
      ) : null}

      {onlineUsers.map((user) => (
        <li key={user}>
          <div
            className={`user ${user === currentUser ? 'user--self' : ''}`}
          >
            <span className="user__status" />
            <span className="username">
              {user}
              {user === currentUser && (
                <span className="user__you"> (You)</span>
              )}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
