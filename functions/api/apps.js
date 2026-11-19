const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

const slugify = (s) =>
  s.toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

async function authorized(request, env) {
  const token = request.headers.get("Cookie")
    ?.split(";")
    .map(x => x.trim())
    .find(x => x.startsWith("wababe_session="))
    ?.split("=")[1];

  if (!token) return false;

  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const raw = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(exp)
  );

  const expected = btoa(
    String.fromCharCode(...new Uint8Array(raw))
  ).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

  return expected === sig;
}

async function getIndex(env) {
  const obj = await env.APPS_BUCKET.get("catalog.json");
  if (!obj) return [];
  try { return await obj.json(); } catch { return []; }
}

async function saveIndex(env, items) {
  await env.APPS_BUCKET.put(
    "catalog.json",
    JSON.stringify(items),
    { httpMetadata: { contentType: "application/json" } }
  );
}

export async function onRequestGet({ request, env }) {
  return json(await getIndex(env));
}

export async function onRequestPost({ request, env }) {
  if (!await authorized(request, env))
    return json({ error: "Unauthorized" }, 401);

  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  const description = String(form.get("description") || "").trim();
  const category = String(form.get("category") || "Other");
  const version = String(form.get("version") || "").trim();
  const file = form.get("file");
  const icon = form.get("icon");

  if (!name || !description || !version ||
      !(file instanceof File) || !file.size)
    return json({ error: "Complete all required fields and select an APK." }, 400);

  if (!file.name.toLowerCase().endsWith(".apk"))
    return json({ error: "Please upload an APK file." }, 400);

  if (file.size > 300 * 1024 * 1024)
    return json({ error: "APK is larger than 300 MB." }, 400);

  let slug = slugify(name);
  if (!slug) return json({ error: "Invalid application name." }, 400);

  const items = await getIndex(env);
  if (items.some(a => a.slug === slug))
    slug += "-" + Date.now().toString().slice(-6);

  const apkKey = `apps/${slug}/${slug}.apk`;

  await env.APPS_BUCKET.put(apkKey, file.stream(), {
    httpMetadata: {
      contentType: "application/vnd.android.package-archive"
    }
  });

  let iconUrl = "";

  if (icon instanceof File && icon.size) {
    if (icon.size > 2 * 1024 * 1024)
      return json({ error: "Icon must be 2 MB or smaller." }, 400);

    const ext = icon.type === "image/png" ? "png" :
      icon.type === "image/webp" ? "webp" : "jpg";

    const key = `apps/${slug}/icon.${ext}`;

    await env.APPS_BUCKET.put(key, icon.stream(), {
      httpMetadata: { contentType: icon.type || "image/jpeg" }
    });

    iconUrl = `/media/${slug}/icon.${ext}`;
  }

  items.unshift({
    slug, name, description, category, version,
    apkKey, icon: iconUrl,
    createdAt: new Date().toISOString()
  });

  await saveIndex(env, items);
  return json({ ok: true, slug }, 201);
}
