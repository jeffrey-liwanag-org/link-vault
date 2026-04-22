# Link Vault

Personal AI bookmark manager. Save a URL → GitHub Action fetches, screenshots, and AI-tags it → Astro site rebuilds on GitHub Pages.

## Prerequisites

- GitHub Pro ($4/mo) — required for GitHub Pages on a private repo
- Anthropic API key with credit
- Node 20+

## Setup

### 1. Create the repo

Create a **private** GitHub repo named `link-vault`. Push this code to it.

### 2. Add the secret

Go to **Settings → Secrets and variables → Actions → New repository secret**:

```
Name:  ANTHROPIC_API_KEY
Value: sk-ant-...
```

### 3. Enable GitHub Pages

Go to **Settings → Pages**:
- Source: **GitHub Actions**

### 4. Install the bookmarklet

Create a new browser bookmark and paste this as the URL (replace `jeffrey-liwanag-org`):

```
javascript:(function(){const u=encodeURIComponent(location.href);const t=encodeURIComponent(document.title);window.open(`https://github.com/jeffrey-liwanag-org/link-vault/issues/new?title=Bookmark:%20${t}&body=${u}&labels=bookmark`,'_blank')})();
```

**Mobile (iOS):** Save any page as a bookmark, then edit the URL and replace with the script above.

### 5. Create the `bookmark` label

Go to **Issues → Labels → New label**:
- Name: `bookmark`
- Color: any

## Local Development

```bash
npm install
npx playwright install chromium
npm run dev       # http://localhost:4321/link-vault
```

## Adding a Bookmark Manually

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run ingest https://example.com/article
git add src/content/bookmarks/ public/screenshots/
git commit -m "bookmark: example.com article"
git push
```

## How It Works

```
Bookmarklet → GitHub Issue (labeled "bookmark")
    → ingest.yml Action runs:
        1. Fetch page + extract readable content
        2. Screenshot with Playwright (compressed <200KB)
        3. Claude API: 2-3 sentence summary + 3-5 tags
        4. Write src/content/bookmarks/{slug}.md
        5. Commit → push → triggers deploy.yml
    → Astro builds static site
    → GitHub Pages serves it
```

## Managing bookmarks from the UI

The site supports in-browser edit/delete/tag operations from the deployed site. You need a GitHub personal access token (PAT):

### Creating a fine-grained PAT

1. Go to https://github.com/settings/personal-access-tokens/new
2. Choose **Fine-grained token**
3. **Resource owner:** `jeffrey-liwanag-org`
4. **Repository access:** Only select `link-vault`
5. **Permissions → Repository → Contents:** Read and write
6. **Expiration:** 90 days (you'll need to refresh it periodically)
7. Generate and copy the token

### Setting up the token in the UI

1. Visit the deployed site
2. Click the ⚙ gear icon in the top navigation
3. Paste the token, click **Validate** (waits for GitHub to confirm the token works)
4. Click **Save**

The token is stored in your browser's localStorage. It is never sent anywhere except directly to `api.github.com`.

### What you can do

| Action | How |
|---|---|
| **Add bookmark** | Click **+ Add** in the bookmarks toolbar → enter URL → GitHub issue opens → existing pipeline enriches it with Claude summary + screenshot |
| **Edit tags** | Open a bookmark → click **Edit tags** → add/remove tags → Save |
| **Edit title** | Open a bookmark → click the pencil icon next to the title → edit → Save |
| **Delete** | Open a bookmark → click **Delete** → confirm |

Changes commit directly to the `main` branch and trigger a Pages rebuild (~30–60 seconds).

> **Security note:** The token is stored in your browser's localStorage. Do not share screenshots of the Settings modal. You can revoke the token at any time from [GitHub settings](https://github.com/settings/personal-access-tokens).

## Privacy Note

The **repo** is private. The **published Pages site** is URL-obscured — accessible to anyone who has the URL, but not indexed or discoverable. For real authentication, consider Cloudflare Pages + Access (free tier).

## Project Structure

```
src/content/bookmarks/   ← one .md file per bookmark
public/screenshots/       ← compressed PNGs
scripts/ingest.ts         ← ingestion pipeline
.github/workflows/
  ingest.yml              ← triggered by "bookmark" label on issues
  deploy.yml              ← triggered on push to main
```
