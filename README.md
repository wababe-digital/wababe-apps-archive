# WABABE APPS — Application Archive

Static Cloudflare Pages site with Pages Functions and Cloudflare R2 storage. Public visitors can browse and download apps without accounts. Only the administrator can sign in and upload/delete apps.

## Cloudflare setup (required before admin/upload works)

1. In Cloudflare, create an **R2 bucket** named `wababe-apps-files`.
2. Open Pages project `wababe-apps` → **Settings** → **Functions** → **R2 bucket bindings**. Add binding:
   - Variable name: `APPS_BUCKET`
   - R2 bucket: `wababe-apps-files`
3. Under Pages → Settings → Variables and Secrets, add these as **secrets** (Production; add Preview too only if needed):
   - `ADMIN_USERNAME` — choose an administrator username.
   - `ADMIN_PASSWORD` — use a long, unique password. Do not put it in GitHub files.
   - `SESSION_SECRET` — a long random secret (at least 32 random characters). Keep it private.
4. Redeploy the latest commit after adding bindings/secrets.

## Uploading the project to GitHub

Upload the contents of this folder to the root of repository `wababe-apps-archive`, preserving the `functions` and `assets` folders. Do not upload only the ZIP file. Commit to branch `main`. Cloudflare Pages will deploy automatically.

## Important notes

- APK upload limit in this starter is 300 MB. The R2 bucket is used for APK files; do not put APKs in the Pages static asset folder.
- The catalog is stored in `catalog.json` inside R2 and is created automatically after the first upload.
- Keep a separate backup of APK files and the R2 bucket contents. A free hosting service cannot guarantee 20 years of uninterrupted operation.
- This project is a first deployable version. Test login, upload, download, and deletion with a small test APK before publishing real apps.
