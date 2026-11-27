# Deploying The Naughty List on a UGREEN NAS

These steps run the game on a UGREEN DXP4800 (UGOS Pro) with its Docker app. Part 1 and part 2 get it running on your home network. Part 3 is optional: it gives the game a public HTTPS address through Cloudflare. To play away from home over a VPN instead, see "Playing away from home over a VPN".

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

## Playing away from home over a VPN

The game runs over plain `http://`. That's fine on your home network and over a VPN such as WireGuard, because the VPN already encrypts the traffic. Connect to the VPN, then open `http://<NAS-address>:8081`, for example `http://192.168.50.156:8081`. Friends who want to play need their own WireGuard profile on your VPN.

Some browsers, especially Chrome on phones, try `https://` first and then show a warning or an error. If that happens, type the address with `http://` in full. If it still switches to `https://`, turn off **Always use secure connections** in Chrome's **Settings > Privacy and security**.

Send friends the address privately. They tap **Create account** on the login screen. Once everyone has joined, turn off **Allow new accounts** under **More > Admin**.

## Part 3 (optional): public HTTPS address with Cloudflare

A Cloudflare Tunnel gives the game a public `https://` address without opening any ports on your router. You need a free Cloudflare account and a domain whose DNS is managed by Cloudflare.

1. In the Cloudflare dashboard, open **Zero Trust**, then **Networks > Tunnels**, and choose **Create a tunnel**.
2. Choose **Cloudflared**, name the tunnel `naughty-list`, and choose **Docker** as the environment. Copy the long token from the command shown. It's the part after `--token`.
3. Under **Public hostname**, add one:
   - Subdomain: for example `naughtylist`
   - Domain: your domain
   - Service: type **HTTP**, URL `naughty-list:8080`
4. In the UGOS Docker app, edit the `naughty-list` project. Remove the `#` from the `cloudflared` lines at the bottom of the compose file, paste your token in place of `paste-your-token-here`, and redeploy.
5. Open `https://naughtylist.<your-domain>`. Share that address with friends so they can create accounts, then turn off **Allow new accounts** under **More > Admin** once everyone has joined.

Tailscale is an alternative if you'd rather keep the game off the public internet. Every friend then has to install Tailscale and join your network.

## Updating to a new version

After a pull request is merged, wait for the **Docker image** check on GitHub to finish, which takes about 3 minutes. Then, in the UGOS Docker app:

1. Open **Image**, find `ghcr.io/cheesezilla/naughty-list`, and pull or update `latest`.
2. Open **Project > naughty-list** and redeploy, or stop and start it.

Saves are kept, because they live in the shared folder rather than in the container.

Merging `integration` into `main` is a release. When the version in `package.json` is new, the same build also publishes a numbered image (for example `1.0.0`), `ghcr.io/cheesezilla/naughty-list:1.0.0`. Use that tag in the compose file to stay on one version or to roll back. See [RELEASING.md](RELEASING.md) for how releases are made.

### Trying a pull request before it is merged

Every pull request also publishes a test image tagged `pr-<number>`, for example `ghcr.io/cheesezilla/naughty-list:pr-11`. To try it on the NAS:

1. Back up the save first: copy `/volume1/docker/naughty-list` (with the game stopped) to somewhere safe. A newer version may upgrade the save, and an older version might not read it afterwards.
2. In **Project > naughty-list**, edit the compose file and change the image line to `ghcr.io/cheesezilla/naughty-list:pr-11`. Save and redeploy.
3. When the pull request is merged, change the line back to `:latest`, pull `latest` and redeploy.

### A second NAS project for the integration branch

The `integration` branch is a test branch that threads can push to directly, without a pull request, so you can try changes straight away. Every push to it publishes the image `ghcr.io/cheesezilla/naughty-list:integration`. `main` stays pull-request only, and the main project keeps pulling `:latest`.

Create a second project in the UGOS Docker app named `naughty-list-test` and paste this. It uses a different container name, host port and save folder, so it never shares a database with the main project:

```yaml
services:
  naughty-list-test:
    image: ghcr.io/cheesezilla/naughty-list:integration
    container_name: naughty-list-test
    ports:
      - "8082:8080"   # main project uses 8081
    volumes:
      - /volume1/docker/naughty-list-test:/data   # separate save folder
    environment:
      - TZ=Asia/Singapore
    restart: unless-stopped
```

Open `http://<your-NAS-address>:8082`. To get the newest integration build, pull the image and redeploy the project. The test save starts empty, and you can delete `/volume1/docker/naughty-list-test` any time to start fresh. When integration work is ready, a pull request merges it into `main`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Pulling the image fails with "denied" or "not found" | The package is still private. See part 1. |
| The page doesn't load | Check the container is running in **Container**. Open its log, which should end with `Server listening at http://0.0.0.0:8080`. Check that the port in the address matches the left number in `ports`. |
| The log says `unable to open database file`, or the container keeps restarting | Update to the latest image, which fixes most cases by itself and otherwise prints what is wrong. Check that `volumes` maps the folder `/volume1/docker/naughty-list` to `/data`, not a single file. If `naughty-list.db` on the NAS is a folder, delete it and redeploy. |
| The log says it can't write to the save folder | Make sure `/volume1/docker` exists. The container fixes folder ownership itself on start, so redeploying usually clears this. |
| Friends get a Cloudflare error page | Check the `naughty-list-tunnel` container is running and its log shows a connection. Check the public hostname's service is `http://naughty-list:8080`. |
| You forgot the admin password | Stop the project, move `naughty-list.db` somewhere safe, and start again. This creates a fresh game. Password reset comes in a later version. |
