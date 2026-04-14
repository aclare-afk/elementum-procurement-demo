# Elementum Procurement Demo — Vercel Deployment Guide

## What this is
A fully hosted version of the Elementum procurement demo.
Once deployed, anyone on your team gets a public URL — no localhost needed.

---

## Step 1 — Create a GitHub account (if you don't have one)
Go to https://github.com and sign up for free.

---

## Step 2 — Create a new GitHub repository
1. Go to https://github.com/new
2. Name it: `elementum-procurement-demo`
3. Set it to **Private**
4. Click **Create repository**

---

## Step 3 — Upload your files to GitHub
On the repository page:
1. Click **"uploading an existing file"** (or "Add file" → "Upload files")
2. Upload ALL of these files keeping the folder structure:
   ```
   index.html
   amazon-mock.html
   vercel.json
   package.json
   api/
     health.js
     approvals.js
     invoices.js
     purchase-orders.js
     vendors.js
     punchout/
       initiate.js
       cart-return.js
     procurement/
       purchase-requests.js
     flow/
       start.js
       [flowId].js
   lib/
     store.js
   ```
3. Click **Commit changes**

---

## Step 4 — Create a Vercel account
1. Go to https://vercel.com
2. Click **Sign Up**
3. Choose **Continue with GitHub** — this links the two accounts

---

## Step 5 — Deploy to Vercel
1. On the Vercel dashboard click **Add New → Project**
2. Find your `elementum-procurement-demo` repo and click **Import**
3. Leave all settings as default
4. Click **Deploy**
5. Wait about 60 seconds

Vercel will give you a URL like:
```
https://elementum-procurement-demo.vercel.app
```

---

## Step 6 — Test it
Open these URLs to confirm everything works:

| URL | What it should show |
|-----|---------------------|
| `https://your-url.vercel.app` | Elementum procurement UI |
| `https://your-url.vercel.app/amazon-mock.html` | Amazon Business mock |
| `https://your-url.vercel.app/api/health` | `{"status":"operational"}` |
| `https://your-url.vercel.app/api/vendors` | List of vendors |

---

## Step 7 — Share with your boss and Tim
Send them your Vercel URL. They can access everything from their own browser.

**Tell Tim:**
> Swap the Beeceptor base URL to `https://your-url.vercel.app`
> The two endpoints are live:
> - `POST https://your-url.vercel.app/api/punchout/initiate`
> - `POST https://your-url.vercel.app/api/procurement/purchase-requests`

---

## Updating files later
Whenever you change a file:
1. Go to your GitHub repo
2. Click the file → click the pencil (edit) icon
3. Make your change → click **Commit changes**
4. Vercel automatically redeploys in ~30 seconds

---

## Running locally (still works)
Nothing changes for local testing:
```bash
# Terminal 1
python3 -m http.server 5500

# Terminal 2
python3 -m uvicorn main:app --reload --port 8000
```
The HTML files auto-detect localhost vs Vercel and use the right API URL.
