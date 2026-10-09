# Hosting Reflexio on AWS

Reflexio is a static site: an HTML page, a JavaScript bundle, and about 24 MB of
images, audio and level XML. It has no server code. The simplest way to host it on
AWS is **Amplify Hosting** connected to the GitHub repo. Amplify builds the game on
every push to `master`, serves it from a global CDN over HTTPS, and needs no S3
buckets, CloudFront distributions or certificates set up by hand.

The repo already has everything Amplify needs:

| File | Purpose |
|------|---------|
| `amplify.yml` | Build spec. Installs dependencies and builds with `BASE_PATH=/`. |
| `customHttp.yml` | Cache headers. Keeps `index.html` and `sw.js` from going stale. |
| `vite.config.js` | Reads `BASE_PATH`, defaulting to `/reflexio-phaser/` for GitHub Pages. |

The console steps below are the only part left to do.

---

## 1. Create the Amplify app

1. Sign in to the AWS console and open **Amplify**. Type "Amplify" in the search
   bar at the top and choose **AWS Amplify**.
2. Check the region selector in the top right. Pick the region closest to you. The
   game is served worldwide from the CDN either way; the region only decides where
   builds run and where the console keeps the app.
3. Choose **Create new app**.
4. Under **Deploy your app**, choose **GitHub**, then **Next**.
5. A GitHub window opens asking you to authorize AWS Amplify. Approve it. When
   GitHub asks which repositories Amplify may access, choose **Only select
   repositories** and pick `kumj2028/reflexio-phaser`. Granting access to one repo
   is safer than granting access to all of them.
6. Back in Amplify, select the repository `kumj2028/reflexio-phaser` and the branch
   `master`. Leave "My app is a monorepo" unchecked. Choose **Next**.

## 2. Confirm the build settings

1. On the **App settings** page, give the app a name, for example `reflexio`.
2. Under **Build settings**, Amplify should report that it found `amplify.yml` in
   the repository. The commands shown should be `npm ci` and
   `BASE_PATH=/ npm run build`, with `dist` as the output directory. If Amplify
   instead shows settings it generated itself, the `amplify.yml` file is missing
   from the `master` branch on GitHub. Push it and start over from step 1.
3. Leave **Service role** at its default. Amplify creates one for you.
4. Choose **Next**, review the summary, then choose **Save and deploy**.

## 3. Wait for the first deploy

Amplify runs four stages: Provision, Build, Deploy and Verify. The first build
takes three to five minutes because it starts with an empty dependency cache.
Later builds are faster.

When every stage shows a green check, the branch page shows a URL like:

```
https://master.d1abc2defgh3ij.amplifyapp.com
```

Open it. The game should load and play exactly as it does on GitHub Pages.

## 4. Check the cache headers

This step matters. If `index.html` or `sw.js` gets cached, returning players
keep running the old build long after you deploy a new one. `customHttp.yml`
prevents that. Confirm it was applied by running these commands from any
terminal, with your own URL in place of the example:

```bash
curl -sI https://master.d1abc2defgh3ij.amplifyapp.com/index.html | grep -i cache-control
curl -sI https://master.d1abc2defgh3ij.amplifyapp.com/sw.js       | grep -i cache-control
```

Both should print `cache-control: no-cache`. If either prints anything else, open
**Hosting > Custom headers** in the app. It should show the contents of
`customHttp.yml`. If it is empty, the file did not reach the build. Make sure it
is committed at the repo root, then redeploy.

## 5. Updating the game

From now on, deploying is just a push:

```bash
git push origin master
```

Amplify notices the push, rebuilds and redeploys within a few minutes. You can
watch progress on the branch page in the console. You no longer need
`npm run deploy`; that command only updates GitHub Pages.

Players pick up a new version the next time they open the game. The service
worker sees the new `sw.js`, downloads the changed files in the background and
reloads. On an iPhone home screen app, fully closing the app and reopening it
forces the check.

## 6. Use your own domain (optional)

Skip this step if the `amplifyapp.com` address is enough.

1. In the app, open **Hosting > Custom domains** and choose **Add domain**.
2. **If the domain is registered in Route 53**, pick it from the list. Amplify
   creates the DNS records and the HTTPS certificate on its own. Choose
   **Configure domain**, decide whether `www` should redirect to the bare domain,
   and save.
3. **If the domain is registered elsewhere** (Namecheap, Cloudflare, GoDaddy and so
   on), type it in and save. Amplify shows two kinds of DNS records to add at your
   registrar: one CNAME that proves you own the domain, and one or more CNAME
   records that point the domain at Amplify. Add them exactly as shown.
4. Wait. Certificate issuance and DNS propagation usually finish within 30
   minutes and can take up to a day. The domain shows **Available** when it is
   done.

Some registrars cannot put a CNAME on the bare domain (`example.com` as opposed
to `www.example.com`). If yours refuses, use `www` or a subdomain such as
`play.example.com`, or move the domain's DNS to Route 53.

## 7. Set a budget alarm

Amplify charges for build minutes, storage and data served. Storage is
negligible here. What costs money is data transfer: a new player downloads
about 24 MB once, because the service worker caches the whole game for offline
play. Returning players download almost nothing. A hobby audience stays at or
near the free tier, but set an alarm before sharing the link widely.

1. Open **Billing and Cost Management** from the account menu in the top right.
2. Choose **Budgets**, then **Create budget**.
3. Pick the **Monthly cost budget** template, set an amount such as $5, enter your
   email address, and create it.

AWS then emails you when spending reaches 85% and 100% of that amount. Current
prices are on the [Amplify pricing page](https://aws.amazon.com/amplify/pricing/).

---

## How it fits together

GitHub Pages serves the site under a subpath, `kumj2028.github.io/reflexio-phaser/`.
Amplify serves it at the root of its domain. Vite bakes that path into every
script, image and level URL at build time, so the two hosts need different
builds. `vite.config.js` reads the `BASE_PATH` environment variable and falls
back to `/reflexio-phaser/`. That keeps `npm run deploy` working for GitHub
Pages, while `amplify.yml` sets `BASE_PATH=/` for Amplify. The game code
reads the path through `import.meta.env.BASE_URL` and never hard-codes it.

You can run both hosts at once. They are separate websites to the browser, so
save data and achievements on one do not carry over to the other. Pick one as
the address you share. If Amplify becomes the only host, you can turn off GitHub
Pages under the repo's **Settings > Pages** on GitHub.

## Troubleshooting

**The page loads but stays black, and the browser console shows 404 errors
for files under `/reflexio-phaser/`.** The build ran without `BASE_PATH=/`.
Check that the build command on the app's **Hosting > Build settings** page
matches `amplify.yml`, then redeploy.

**The build fails during `npm ci`.** Open the failed build and read the log for
the Build stage. If it mentions an unsupported Node version, add these two lines
at the top of the `preBuild` commands in `amplify.yml`, then push:

```yaml
        - nvm install 20
        - nvm use 20
```

**A new deploy succeeded but the game still shows the old version.** Run the
`curl` check from step 4. If `index.html` or `sw.js` is not `no-cache`, the
headers are missing. If the headers are right, the browser is holding an old
service worker. Clear the site data for the address, or on iPhone delete the
home screen icon and add it again.

**The iPhone home screen app opens the GitHub Pages version.** A home screen
icon remembers the address it was added from. Delete the old icon, open the
Amplify address in Safari, and add it to the home screen again.
