function slugify(value, fallback = "item") {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

async function uniqueValue(db, table, column, base, excludeId = null) {
  let value = base;
  let suffix = 2;
  const collection = await db.collection(table);
  while (await collection.findOne({
    [column]: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    ...(excludeId ? { id: { $ne: excludeId } } : {}),
  })) {
    value = `${base}-${suffix}`;
    suffix += 1;
  }
  return value;
}

async function createUsername(db, firstName, lastName, email) {
  const emailName = String(email || "").split("@")[0];
  const base = slugify(`${firstName}-${lastName}` || emailName, "user");
  return uniqueValue(db, "users", "username", base);
}

async function createGroupSlug(db, name) {
  return uniqueValue(db, "groups", "slug", slugify(name, "group"));
}

async function createEventSlug(db, title) {
  return uniqueValue(db, "events", "slug", slugify(title, "event"));
}

module.exports = { slugify, createUsername, createGroupSlug, createEventSlug };
