# Keelerada teacher PoC

Frontend-only proof of concept for teachers: upload a text file (PDF / TXT / DOCX), enrich it with curriculum context via Google Gemini, extract study words, generate exercises, and save everything in the browser (`localStorage`).

UI language is **Estonian**. Visual style follows the Keelerada product look (cream background, pill buttons, orange tab accent).

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui-style components
- Google Gemini (`@google/generative-ai`) from the browser
- GitHub Pages hosting (`HashRouter`, base `/keelerada-test/`)

## Local development

Requirements: Node.js 18+ (20 recommended).

```bash
npm install
npm run dev
```

Open the printed local URL (note the base path: `/keelerada-test/`).

### API keys (local)

1. Copy `.env.example` → `.env`
2. Put `VITE_GEMINI_API_KEY=...` in `.env` (never commit `.env`)
3. Restart `npm run dev`
4. Optional: `VITE_EKILEX_API_KEY=...` for [Ekilex](https://ekilex.ee/swagger-ui/index.html) word checks ([get a key](https://ekilex.ee/userprofile))

You can also paste keys in the app **Settings** (gear). A value saved in Settings overrides the build-time env key in that browser.

Currently only **Google Gemini** is wired. Claude / ChatGPT keys are not supported yet.

```bash
npm run build
npm run preview
```

## Security warning (demo only)

The Gemini API key is used **in the browser**. Anyone with the page can extract it from network traffic or storage. Use a temporary Google account and delete the key/project after the demo. Do not put a production key here.

## Deferred configuration

| Item | Where to put it later |
|------|------------------------|
| Exercise prompt | Already in `src/lib/prompts.ts` → `PROMPTS.createExercises` |
| Õppekava URL | Default OKMV Põhikool; change in Settings |
| Gemini / Ekilex keys | Settings gear, or `.env` locally |

Curriculum page fetch may fail due to CORS; the app continues with class / subject / topic (and the URL string) sent to Gemini.

## Persistence

Saved materials live under `localStorage` keys:

- `keelerada.materials.v1`
- `keelerada.settings.v1`

They are tied to this browser/device only. Mock teacher profile: **Sabina P**.

## GitHub Pages (demo with working Gemini)

Do **not** commit `.env`. Instead:

1. Push the repo (without `.env` / `node_modules` / `dist`).
2. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `VITE_GEMINI_API_KEY`
   - Value: your temporary Gemini key  
   Optional: `VITE_EKILEX_API_KEY` the same way.
3. **Settings → Pages → Build and deployment**: source **GitHub Actions**.
4. Push to `main` (or run **Deploy to GitHub Pages** manually). The workflow bakes the secret into the build so the published site works without visitors pasting a key.
5. URL: `https://<user>.github.io/keelerada-test/`

**Reality check:** anyone can still extract the key from the published JS or Network tab. Use only a throwaway key and delete it after the demo.

Workflow: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

## Main flow

1. **Uus materjal** — upload file + klass / aine / teema  
2. Review extracted text  
3. Gemini → õppekava goals & keywords (editable)  
4. Gemini → word list (editable)  
5. Gemini → exercises (editable)  
6. Save → **Salvestatud** library
