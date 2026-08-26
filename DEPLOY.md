# Deploying My Strava Journey to GitHub Pages

Your site will be live at **https://hpgerald.github.io/my-strava-journey/**

This project is already configured for GitHub Pages:

- Vite `base: './'` (relative asset paths)
- `HashRouter` (so deep links like `.../#/where` work without server config)
- A GitHub Actions workflow at `.github/workflows/deploy.yml` that builds and deploys on every push to `main`

You do NOT need to build locally to deploy; the Action does it for you.

---

## One-time setup

**0. Prerequisites.** Install [Git](https://git-scm.com/downloads) and create a free account at [github.com](https://github.com), if you don't have them.

**1. Create an empty repo.** On github.com, create a new repository named **`my-strava-journey`**. Do not add a README, .gitignore or licence (the project already has these).

**2. Push the project.** Open a terminal in the project folder (`my-strava-journey`) and run:

```bash
git init
git add .
git commit -m "Dira-style Strava explainer site"
git branch -M main
git remote add origin https://github.com/hpgerald/my-strava-journey.git
git push -u origin main
```

**3. Turn on Pages via Actions.** On github.com, go to the repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.

**4. Wait for the deploy.** Open the **Actions** tab and wait for the "Deploy to GitHub Pages" run to finish (green tick, about 1–2 minutes).

**5. Visit your site:** https://hpgerald.github.io/my-strava-journey/

---

## Updating later (including weekly data refreshes)

The site is data-driven: everything lives in `public/data/*.csv`. To update, replace or add CSVs (or edit any file), then:

```bash
git add .
git commit -m "Weekly data refresh"
git push
```

The Action redeploys automatically. No other steps.

---

## Fallback: deploy without Actions

If you prefer to build and publish from your machine:

```bash
npm install
npm run build
npm run deploy   # publishes dist/ to the gh-pages branch via the gh-pages package
```

Then set **Settings → Pages → Source: Deploy from a branch → `gh-pages`**.

---

## Running it locally

```bash
npm install
npm run dev      # dev server, usually http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

Useful routes while developing: `/#/debug` (data row counts) and `/#/design` (design system).
