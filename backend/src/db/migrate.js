const db = require(".");

async function migrate() {
  await db.connect();
  return [];
}

module.exports = migrate;

if (require.main === module) {
  migrate()
    .then(() => console.log("MongoDB indexes are ready."))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}
