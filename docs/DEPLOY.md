# Deploying The Naughty List on a UGREEN NAS

These steps run the game on a UGREEN DXP4800 (UGOS Pro) with its Docker app. Part 1 and part 2 get it running on your home network. Part 3 is optional: it adds HTTPS and lets friends play from anywhere.

Button names can differ a little between UGOS versions. If a label doesn't match, look for the closest one.

## Part 1: let the NAS download the game (once)

Every merge to `main` publishes the image `ghcr.io/cheesezilla/naughty-list:latest`. GitHub makes new packages private, so the NAS can't download it yet. Pick one of these:

- **Make the package public (simplest).** On GitHub, go to your profile, open **Packages**, then **naughty-list**. Choose **Package settings**, then **Change visibility**, and set it to **Public**. Only the built game becomes public. The source code stays private.
- **Or keep it private.** Create a GitHub personal access token (classic) with only the `read:packages` scope. In the UGOS Docker app, open **Registry** (or **Image > Add registry**), add `ghcr.io`, and log in with your GitHub username and the token as the password.

## Part 2: run it on the NAS

1. In **File Manager**, make sure there is a shared folder called `docker` on volume 1. Create it if it's missing. The game creates its own `naughty-list` folder inside it.
2. Open the **Docker** app, go to **Project** and choose **Create**.
3. Name the project `naughty-list`, and paste in the contents of [`compose.yaml`](../compose.yaml) from this repo.
4. Optional: `TZ=Asia/Singapore` sets the time zone for the server's log. Change it to yours if needed. The game uses port 8081 on the NAS. If that port is taken, change the left number, for example `"8090:8080"`.
5. Choose **Deploy** (or **Create and start**). The first start downloads about 60 MB.
6. Open `http://<your-NAS-address>:8081`, for example `http://192.168.1.50:8081`. You can find the address in UGOS under **Control Panel > Network**.
7. Create your account. The first account on a new server becomes the admin.

Saves live in `/volume1/docker/naughty-list/naughty-list.db`. Include that folder in your UGOS backups.

## Part 3 (optional): HTTPS, and letting friends play from anywhere

Browsers only trust an `https://` certificate for a real name, never for a bare address like `192.168.50.156`. A Cloudflare Tunnel gives the game a name such as `https://naughtylist.example.com` with a real certificate, without opening any ports on your router. Friends can use the same address from anywhere.

You need a free Cloudflare account and a domain that Cloudflare manages. Cloudflare doesn't give out free domains. The simplest choice is to buy one through Cloudflare, which sells at cost, about US$10 a year for a `.com`. Other options are listed at the end of this part.

### Step 1: get a domain on Cloudflare

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) with a free account.
2. Open **Domain Registration > Register Domains**, search for a name you like, and buy it. Turn on auto-renew so it doesn't lapse.
3. The domain appears under **Websites** (or **Domains**) a few minutes later, already using Cloudflare's DNS. Nothing else to set up there.

If you already own a domain elsewhere, add it to Cloudflare under **Add a domain**, pick the **Free** plan, and change the nameservers at your registrar to the two that Cloudflare shows. It's ready when Cloudflare emails you that the domain is active, usually within an hour.

### Step 2: create the tunnel

1. In the Cloudflare dashboard, open **Zero Trust**. The first time, it asks you to choose a team name and the **Free** plan. It may ask for a card, but the free plan isn't charged.
2. Open **Networks > Tunnels** and choose **Create a tunnel**.
3. Choose **Cloudflared**, name it `naughty-list`, and choose **Docker** as the environment. Copy the long token from the command shown. It's the part after `--token`. Don't run the command itself.
4. Under **Public hostname** (called **Published application routes** in newer dashboards), add one:
   - Subdomain: for example `naughtylist`
   - Domain: your domain
   - Service: type **HTTP**, URL `naughty-list:8080`

   Use 8080 here even though the NAS uses 8081. The tunnel talks to the game container directly, inside Docker, where the game listens on 8080.
5. Save the tunnel.

### Step 3: start the tunnel on the NAS

1. In the UGOS Docker app, edit the `naughty-list` project.
2. Remove the `#` from the `cloudflared` lines at the bottom of the compose file, so they line up with `naughty-list:` above. Paste your token in place of `paste-your-token-here`.
3. Redeploy. A second container, `naughty-list-tunnel`, starts. Its log should say `Registered tunnel connection` within a few seconds, and the tunnel shows **Healthy** in the Cloudflare dashboard.
4. Open `https://naughtylist.<your-domain>`. The padlock shows, with no warning.

Log in, go to the **Admin** tab, and create invite links there. Links copy the address you're browsing from, so open the game through the `https://` address when you invite friends. You can still use `http://<NAS-address>:8081` at home, but the `https://` address works everywhere, so it's easiest to use it on every device.

Keep the token private. Anyone with it can run your tunnel. If it leaks, delete the tunnel in Cloudflare and create a new one.

### Other options

- **Free subdomain services.** A few services give out free domains that can be moved to Cloudflare, such as [EU.org](https://nic.eu.org). Approval can take days or weeks, and they're less reliable than a bought domain.
- **Try it now without a domain.** Add this service to the project, redeploy, and the tunnel container's log prints a random `https://….trycloudflare.com` address. The address changes every time the container restarts, so it's only good for a quick test, not for friends.

  ```yaml
    quick-tunnel:
      image: cloudflare/cloudflared:latest
      command: tunnel --no-autoupdate --url http://naughty-list:8080
  ```
- **Tailscale.** If you'd rather keep the game off the public internet, Tailscale gives a free `https://….ts.net` address with a real certificate. Every friend then has to install Tailscale and join your network.

## Updating to a new version

After a pull request is merged, wait for the **Docker image** check on GitHub to finish, which takes about 3 minutes. Then, in the UGOS Docker app:

1. Open **Image**, find `ghcr.io/cheesezilla/naughty-list`, and pull or update `latest`.
2. Open **Project > naughty-list** and redeploy, or stop and start it.

Saves are kept, because they live in the shared folder rather than in the container.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Pulling the image fails with "denied" or "not found" | The package is still private. See part 1. |
| The page doesn't load | Check the container is running in **Container**. Open its log, which should end with `Server listening at http://0.0.0.0:8080`. Check that the port in the address matches the left number in `ports`. |
| The log says `unable to open database file`, or the container keeps restarting | Update to the latest image, which fixes most cases by itself and otherwise prints what is wrong. Check that `volumes` maps the folder `/volume1/docker/naughty-list` to `/data`, not a single file. If `naughty-list.db` on the NAS is a folder, delete it and redeploy. |
| The log says it can't write to the save folder | Make sure `/volume1/docker` exists. The container fixes folder ownership itself on start, so redeploying usually clears this. |
| Friends get a Cloudflare error page | Check the `naughty-list-tunnel` container is running and its log shows a connection. Check the public hostname's service is `http://naughty-list:8080`. |
| You forgot the admin password | Stop the project, move `naughty-list.db` somewhere safe, and start again. This creates a fresh game. Password reset comes in a later version. |
