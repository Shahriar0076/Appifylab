function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    name: `${row.first_name} ${row.last_name}`,
    email: row.email,
    avatarUrl: row.avatar_url,
  };
}

module.exports = { publicUser };
