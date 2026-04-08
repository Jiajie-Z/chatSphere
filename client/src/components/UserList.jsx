export default function UserList({ users, currentUser }) {
  return (
    <ul className="users">
      {Object.values(users).map((user) => (
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