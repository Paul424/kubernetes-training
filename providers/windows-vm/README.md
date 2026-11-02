# Provider: Windows + VMware Workstation (local VM)

## Table of Contents

- [Context](#context)
- [When to use this provider](#when-to-use-this-provider)
- [Host requirements](#host-requirements)
- [VM specs](#vm-specs-as-used)
- [Setting up a graphical environment inside the VM](#setting-up-a-graphical-environment-inside-the-vm)
- [Choosing your access path: VM browser vs Windows browser](#choosing-your-access-path-vm-browser-vs-windows-browser)
- [Windows hosts file (Option B only)](#windows-hosts-file-option-b-only)
- [Network connectivity: Windows ↔ Minikube VIP (Option B only)](#network-connectivity-windows--minikube-vip-option-b-only)
- [TLS certificates (mkcert)](#tls-certificates-mkcert)
- [Memory / Resources](#memory--resources)
- [Reboot persistence — THE MOST IMPORTANT SECTION](#reboot-persistence--the-most-important-section)
- [The complete solution — systemd service](#the-complete-solution--systemd-service)
- [Full verification checklist](#full-verification-checklist)
- [Recommendations](#recommendations)

---

## Context

This provider describes how to run the Kubernetes training environment on a
**local VM (Ubuntu Server 24.04) hosted on a Windows laptop using VMware
Workstation Pro**, instead of a cloud-hosted tenant (e.g. KPN/CloudNL).

This path works, but you **will** run into a number of non-obvious issues
related to nested networking, TLS trust, and reboot-persistence that people
on a native Linux host or a cloud VM typically don't face. This document
lists every issue encountered, the fix, and — critically — whether the fix
**survives a reboot** of the VM.

> ⚠️ Read the warnings carefully. Several "fixes" look like they work, but
> silently revert after a reboot unless you also apply the steps marked
> 🔒 **PERSISTENT**.

## When to use this provider

Use this setup if:
- You don't have access to a cloud-hosted VM (KPN tenant / CloudNL)
- You have a Windows laptop with enough resources (16GB+ RAM / 4+ cores recommended)
- You're OK with some one-time plumbing to get things working

Prefer the cloud-hosted VM provider if available — it avoids all of the
nested-networking issues below out of the box (see main README / KPN
provider docs, once available).

## Host requirements

- Windows 10/11
- VMware Workstation Pro 17+ (licensed)
- At least 16GB RAM / 4 CPU cores available to assign to the VM
- A VMware virtual network adapter (VMnet) with a known subnet — only
  relevant if you choose **Option B** below (check via `ipconfig` on Windows)

## VM specs (as used)

| Resource | Value |
|---|---|
| OS | Ubuntu Server 24.04 LTS |
| RAM | 16 GB |
| CPU | 4 cores |
| Driver for minikube | `docker` |

---

## Setting up a graphical environment inside the VM

By default Ubuntu Server has no GUI. Installing a lightweight desktop lets
you open a browser **inside the VM itself** — this is the recommended path
(see "Option A" below) since it avoids a whole category of Windows↔VM
networking and TLS trust issues entirely.

### Install XFCE + terminal + browser

```bash
sudo apt update
sudo apt install --no-install-recommends \
  open-vm-tools-desktop \
  xfce4 xfce4-terminal xfce4-session \
  lightdm \
  firefox-esr
```

During `lightdm` install, choose `lightdm` as the default display manager if prompted.

### Enable graphical boot target

```bash
sudo systemctl set-default graphical.target
sudo systemctl enable lightdm
sudo reboot
```

🔒 **PERSISTENT** — `systemctl set-default` and `enable` are persistent by design.

### ⚠️ Known issue: "Failed to start session" after login

**Symptom:** LightDM login screen appears, password is accepted, but you get
"Failed to start session" and are bounced back to the login screen.

**Root cause:** LightDM (with the `unity-greeter`) requests a session named
`ubuntu`, which doesn't exist — only `xfce` is available (only XFCE was
installed, not the full `ubuntu-desktop` meta-package). This stale "ubuntu"
value is stored in **two places**, and both need fixing:

1. `~/.dmrc` (per-user, in home directory)
2. `/var/lib/AccountsService/users/<username>` (system-wide, managed by `accounts-daemon`)

**Diagnose:**
```bash
ls /usr/share/xsessions/
# should show: xfce.desktop  (not ubuntu.desktop)

cat ~/.dmrc
sudo cat /var/lib/AccountsService/users/<username>
```

If either shows `Session=ubuntu` / `XSession=ubuntu`, that's the problem.

**Fix:**

```bash
# 1. Fix the user-level file
nano ~/.dmrc
```
Content:
```ini
[Desktop]
Session=xfce
```

```bash
# 2. Fix the system-level file — IMPORTANT: stop the daemon first,
#    otherwise it silently overwrites your edit from its in-memory cache.
sudo systemctl stop accounts-daemon
sudo nano /var/lib/AccountsService/users/<username>
```
Content:
```ini
[User]
Session=xfce
XSession=xfce
Icon=/home/<username>/.face
SystemAccount=false
```

```bash
sudo systemctl start accounts-daemon
sudo systemctl restart lightdm
```

🔒 **PERSISTENT** — Once both files are corrected while `accounts-daemon`
is stopped during the edit, this survives reboots. Editing the file while
the daemon is running does **not** stick — it gets overwritten back to
`ubuntu` within seconds.

✅ **Verification**
```bash
sudo cat /var/lib/AccountsService/users/<username>
# Session=xfce / XSession=xfce should remain after `systemctl restart accounts-daemon`
```

---

## Choosing your access path: VM browser vs Windows browser

There are two ways to reach Traefik/Grafana/Prometheus/Alertmanager/Keycloak.
**Pick one** — the rest of this document is structured around that choice.

### ✅ Option A (recommended): Browser inside the VM itself

Since the VM has a graphical environment (see section above), you can
simply browse **from Firefox inside Ubuntu**. This avoids a whole category
of Windows↔VM networking and TLS trust issues.

**Required:** only an `/etc/hosts` entry **on Ubuntu itself**:

```bash
sudo tee -a /etc/hosts > /dev/null << 'EOF'
192.168.49.100 traefik.dev.local
192.168.49.100 grafana.dev.local
192.168.49.100 prometheus.dev.local
192.168.49.100 alertmanager.dev.local
192.168.49.100 keycloak.dev.local
EOF
```

✅ **Verification**
```bash
grep dev.local /etc/hosts
```

🔒 **PERSISTENT** — plain file, survives reboots automatically.

➡️ With this option, you can **skip the sections "Windows hosts file",
"Network connectivity: Windows ↔ Minikube VIP" and "Import the CA into
Windows"** further down this document.

⚠️ `minikube tunnel` (see "Reboot persistence" section) is still required,
even for access from Ubuntu itself — the VIP lives on an internal Docker
network that even the Ubuntu host can't reach directly without a tunnel.

⚠️ For TLS: `mkcert -install` automatically installs the CA into Ubuntu's
local NSS store, so Firefox **inside the VM** already trusts the
certificate. You only need the "Setup on Ubuntu" part of the TLS section,
not the Windows-import part.

### Option B (optional): Browser on Windows

If you prefer working from a browser on Windows (e.g. to avoid switching
between windows), **additional** steps are needed: Windows hosts file,
iptables rules between the Windows and Docker subnets, a Windows route, and
importing the mkcert CA certificate into the Windows certificate store.

> This is purely for comfort — functionally Option A works identically with
> much less hassle. Only consider this if you really prefer not to work
> inside the VM session.

---

## Windows hosts file (Option B only)

> Skip this section if you're using Option A (browser inside the VM).

Local domains (`*.dev.local`) must point to the right IP — **from Windows'
perspective**.

Common mistakes:
- PowerShell not started as Administrator → changes are silently not saved
- Script content pasted line-by-line into the console instead of run as a `.ps1` file

**Fix** — Open PowerShell as Administrator, paste as one block:

```powershell
$$h = "$$env:windir\System32\drivers\etc\hosts"
@(
  "192.168.49.100 traefik.dev.local",
  "192.168.49.100 grafana.dev.local",
  "192.168.49.100 prometheus.dev.local",
  "192.168.49.100 alertmanager.dev.local",
  "192.168.49.100 keycloak.dev.local"
) | ForEach-Object {
  $$line = $$_
  $$pattern = [regex]::Escape(($$line -split ' ')[1])
  if (-not (Select-String -Path $$h -Pattern $$pattern -Quiet)) {
    Add-Content -Path $$h -Value $$line
  }
}
```

✅ **Verification**
```powershell
Get-Content "$env:windir\System32\drivers\etc\hosts" | Select-String "dev.local"
```
⚠️ Double-check all 5 lines are present — count them. We once had a missing
line with no clear error.

🔒 **PERSISTENT** — Plain file, survives reboots automatically. No extra action needed.

---

## Network connectivity: Windows ↔ Minikube VIP (Option B only)

> ⚠️ Skip this entire section if you're using Option A (browser inside the
> VM). You still need `minikube tunnel` (see Reboot Persistence section),
> but not the iptables rules or Windows route below — those are specific
> to Windows↔Docker-network connectivity.

**Problem:** Minikube (Docker driver) runs on its own internal Docker
network (`192.168.49.0/24`), which is unreachable from Windows by default.

### Step 1 — Start the tunnel
```bash
minikube tunnel
```
(see the systemd service further down for the permanent/automatic version)

### Step 2 — Enable IP forwarding on Ubuntu
```bash
sysctl net.ipv4.ip_forward
```
If this doesn't return `1`:
```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
```
🔒 **PERSISTENT** — The `tee -a /etc/sysctl.conf` above already makes this persistent.

### Step 3 — Docker's firewall blocks external traffic to the bridge

**Diagnose:**
```bash
sudo iptables -L DOCKER-USER -v -n
```

First find your own subnets:
```bash
ip addr show        # Ubuntu side — e.g. ens33 adapter
```
```powershell
ipconfig             # Windows side — matching VMnet adapter subnet
```

**Fix** (replace subnets with your own!):
```bash
sudo iptables -I DOCKER-USER -s <windows-subnet>/24 -d 192.168.49.0/24 -j ACCEPT
sudo iptables -I DOCKER-USER -s 192.168.49.0/24 -d <windows-subnet>/24 -j ACCEPT
```

🔒 **PERSISTENT** (crucial — these rules disappear on reboot otherwise!)
```bash
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```
⚠️ Note: even with `iptables-persistent`, these rules sometimes still
vanished due to a boot-timing issue. The real, bulletproof fix is the
systemd service further down. Do this step anyway, but don't rely on it blindly.

### Step 4 — Add a route on Windows
```powershell
route -p add 192.168.49.0 mask 255.255.255.0 <ubuntu-vmnet-ip>
```
(e.g. `192.168.152.10` — find via `ipconfig` on Windows, must match the
Ubuntu-side subnet from Step 3)

🔒 **PERSISTENT** — The `-p` flag above already makes this route persistent.

✅ **Verification (full chain)**
```powershell
route print -4 | findstr 192.168.49
ping <ubuntu-vmnet-ip>
curl.exe -k -i -u traefik:traefik -H "Host: traefik.dev.local" https://192.168.49.100 --max-time 10
```

---

## TLS certificates (mkcert)

**Problem:** Traefik's self-signed certificate triggers browser warnings.

### Setup on Ubuntu (required for both Option A and B)
```bash
sudo apt install libnss3-tools -y
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
mkcert -install
mkdir -p ~/certs && cd ~/certs
mkcert traefik.dev.local grafana.dev.local prometheus.dev.local alertmanager.dev.local keycloak.dev.local "*.dev.local"
```

✅ With Option A, you're done here — `mkcert -install` already installed
the CA into Ubuntu's local NSS/Firefox store. Firefox inside the VM now
trusts the certificate automatically.

### Create Kubernetes Secret + TLSStore (required for both A and B)
```bash
kubectl create secret tls mkcert-dev-local-tls \
  --cert=traefik.dev.local+5.pem \
  --key=traefik.dev.local+5-key.pem \
  -n traefik

kubectl apply -f - << 'EOF'
apiVersion: traefik.io/v1alpha1
kind: TLSStore
metadata:
  name: default
  namespace: traefik
spec:
  defaultCertificate:
    secretName: mkcert-dev-local-tls
EOF
```

⚠️ **This Secret + TLSStore are created manually, not via Flux/Git.** They
survive a VM reboot fine (they live in etcd), **but** if anyone ever runs
`minikube delete` (full cluster rebuild), they are gone and these two
commands need to be re-run. Treat this as a "post-rebuild step" in your own notes.

### Import the CA into Windows (Option B only)

> Skip this if you're using Option A (browser inside the VM).

On Ubuntu:
```bash
cat "$(mkcert -CAROOT)/rootCA.pem"
```
Copy the full output → paste into Notepad → save as `C:\temp\rootCA.pem`
(choose "All files" as file type!)

In **Administrator** PowerShell:
```powershell
Import-Certificate -FilePath "C:\temp\rootCA.pem" -CertStoreLocation Cert:\LocalMachine\Root
```
🔒 **PERSISTENT** — Permanently imports the CA into the Windows cert store.
Survives Windows reboots.

⚠️ **Known gotcha: Microsoft Defender "Network Protection"**
On corporate/managed laptops, Microsoft Defender sometimes intercepts TLS
traffic and replaces certificates — even for local IP traffic. This causes
`SEC_E_UNTRUSTED_ROOT` errors despite a correctly imported CA.

**Diagnose:**
```powershell
Get-Process | Where-Object { $_.ProcessName -match "zscaler|netskope|MsMpEng|MDATP" }
```

If present: this is **not** fixable yourself (`Set-MpPreference` gives
"You don't have enough permissions"). Workaround: just accept the browser
warning (Chrome → "Advanced" → "Proceed to ... unsafe"). The site works
functionally, just without the padlock icon.

⚠️ **Extra gotcha: HSTS blocks click-through in Edge**
If Edge shows no click-through option at all on the warning:
```
edge://net-internals/#hsts
```
→ "Delete domain security policies" → enter domain → Delete → fully quit
Edge (including background processes!) and restart.

---

## Memory / Resources

**Problem:** The Minikube container often gets a too-low memory limit
(e.g. 3.8GB) assigned by default, even though the VM has much more
available. This causes spikes to 95%+ memory usage and crash risk.

**Diagnose:**
```bash
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

**Fix:**
```bash
docker update --memory=10g --memory-swap=12g minikube
```

🔒 **PERSISTENT** — This survives a reboot as long as the container isn't
fully removed/rebuilt. Also set the future default for safety:
```bash
minikube config set memory 10240
```
(used on any future `minikube start` after a `minikube delete`)

---

## Reboot persistence — THE MOST IMPORTANT SECTION

These were by far the most time-consuming issues. After every VM reboot,
things had to be manually restored — until the root causes were found.

> ℹ️ This section is relevant for **both Option A and Option B** —
> `minikube tunnel` and the fixes below are needed regardless of where you
> browse from.

### Problem A — Minikube container doesn't auto-start after reboot

**Diagnose:**
```bash
docker inspect minikube --format='{{.HostConfig.RestartPolicy.Name}}'
```
If this returns `no`, that's the problem.

**Fix (and immediately persistent):**
```bash
docker update --restart=unless-stopped minikube
```

### Problem B — containerd/kubelet are "disabled" inside the container

**Diagnose:**
```bash
docker exec minikube systemctl status containerd
```
Watch for `Loaded: ... disabled`.

**Fix:**
```bash
docker exec minikube systemctl enable containerd
docker exec minikube systemctl enable kubelet
docker exec minikube systemctl start containerd
docker exec minikube systemctl start kubelet
```
🔒 **PERSISTENT** — `systemctl enable` is itself the persistent fix —
ensures both services auto-start on every boot of the container. One-time
execution is enough.

### Problem C — DNS name `control-plane.minikube.internal` not resolvable after reboot

The most treacherous bug. Causes a cascade: kube-proxy and the MetalLB
controller can't reach the Kubernetes API → the LoadBalancer VIP doesn't
get assigned → it even looks like the MetalLB config got corrupted, when it
hasn't.

**Diagnose:**
```bash
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=20
```
Look for: `lookup control-plane.minikube.internal ... no such host`

**Fix:**
```bash
docker exec minikube sh -c 'echo "192.168.49.2 control-plane.minikube.internal" >> /etc/hosts'
kubectl delete pod -n kube-system -l k8s-app=kube-proxy
kubectl delete pod -n metallb-system -l app=metallb,component=controller
```

🔒 **PERSISTENT — IMPORTANT** ⚠️ This `/etc/hosts` edit does **NOT**
survive a reboot — Docker regenerates this file on every container
restart. It must therefore be part of the systemd service below, otherwise
this issue returns on every reboot.

### Problem D — MetalLB ConfigMap can become corrupted

**Diagnose:**
```bash
kubectl get configmap config -n metallb-system -o yaml
```
Check that `addresses:` contains a valid IP range (e.g.
`192.168.49.100-192.168.49.100`), not something broken like `- -`.

**Fix if corrupted:**
```bash
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
  namespace: metallb-system
data:
  config: |
    address-pools:
    - name: default
      protocol: layer2
      addresses:
      - 192.168.49.100-192.168.49.100
EOF
kubectl delete pod -n metallb-system -l app=metallb,component=speaker
kubectl delete pod -n metallb-system -l app=metallb,component=controller
```

---

## The complete solution — systemd service

This is the single most important fix in this whole document. This systemd
service ensures that on every reboot, automatically and in the right order:

1. Waits for Docker to be ready
2. Waits for the `minikube` container to respond
3. Applies the DNS hosts fix (Problem C)
4. Waits for Kubernetes itself to become reachable
5. Force-refreshes kube-proxy and the MetalLB controller (fixes Problem C/D
   definitively, regardless of timing)
6. Sets the required iptables rules — **only relevant if you use Option B;
   with Option A you can remove those two lines from the script**
7. Only then starts the tunnel itself

```bash
sudo tee /etc/systemd/system/minikube-tunnel.service > /dev/null << 'EOF'
[Unit]
Description=Minikube Tunnel for LoadBalancer services
After=docker.service network.target

[Service]
Type=simple
User=root
Environment=HOME=/home/<username>
Environment=KUBECONFIG=/home/<username>/.kube/config
ExecStartPre=/bin/sh -c 'for i in $(seq 1 30); do docker info >/dev/null 2>&1 && exit 0; sleep 2; done; exit 1'
ExecStartPre=/bin/sh -c 'for i in $(seq 1 15); do docker exec minikube true >/dev/null 2>&1 && exit 0; sleep 2; done; exit 1'
ExecStartPre=/bin/sh -c 'docker exec minikube sh -c "grep -q control-plane.minikube.internal /etc/hosts || echo 192.168.49.2 control-plane.minikube.internal >> /etc/hosts"'
ExecStartPre=/bin/sh -c 'for i in $(seq 1 60); do kubectl get nodes >/dev/null 2>&1 && exit 0; sleep 2; done; exit 1'
ExecStartPre=/bin/sh -c 'kubectl delete pod -n kube-system -l k8s-app=kube-proxy --ignore-not-found'
ExecStartPre=/bin/sh -c 'kubectl delete pod -n metallb-system -l app=metallb,component=controller --ignore-not-found'
ExecStartPre=/bin/sh -c 'sleep 15'
ExecStartPre=/bin/sh -c '/sbin/iptables -C DOCKER-USER -s <windows-subnet>/24 -d 192.168.49.0/24 -j ACCEPT 2>/dev/null || /sbin/iptables -I DOCKER-USER -s <windows-subnet>/24 -d 192.168.49.0/24 -j ACCEPT'
ExecStartPre=/bin/sh -c '/sbin/iptables -C DOCKER-USER -s 192.168.49.0/24 -d <windows-subnet>/24 -j ACCEPT 2>/dev/null || /sbin/iptables -I DOCKER-USER -s 192.168.49.0/24 -d <windows-subnet>/24 -j ACCEPT'
ExecStart=/usr/local/bin/minikube tunnel
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable minikube-tunnel.service
sudo systemctl start minikube-tunnel.service
```

🔒 **PERSISTENT** — `systemctl enable` above ensures this service
auto-starts on every boot. This is the core fix of this whole document.

**Fill in before use:**
- `<username>` → your own Linux username (check with `whoami`)
- `<windows-subnet>` → **only needed for Option B** — subnet of your own
  VMware network adapter (see networking section, step 3). With Option A
  you can simply omit the two `iptables` `ExecStartPre` lines.
- Verify the minikube binary path: `which minikube` (can be
  `/usr/local/bin/minikube` or `/usr/bin/minikube` — adjust `ExecStart`
  accordingly)

⚠️ **Avoid `Requires=docker.service` in `[Unit]`** — this caused
"Dependency failed" because Docker wasn't fully ready at the exact moment
of the check. The active wait-loops (`ExecStartPre`) are more reliable than
a hard dependency.

---

## Full verification checklist

Run this after setup or after every reboot.

### On Ubuntu (always relevant):
```bash
# Container healthy + correct memory limit?
docker ps | grep minikube
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Cluster healthy?
kubectl get nodes
kubectl get pods -A

# Traefik has the correct external VIP? (NOT equal to CLUSTER-IP!)
kubectl get svc -n traefik traefik -o wide

# Tunnel service running?
sudo systemctl status minikube-tunnel.service

# VIP reachable from Ubuntu itself?
curl -k -v -u traefik:traefik -H "Host: traefik.dev.local" https://192.168.49.100 --max-time 5
```

### Option B only — extra checks on Ubuntu:
```bash
# iptables rules present?
sudo iptables -L DOCKER-USER -v -n
```

### Option B only — on Windows:
```powershell
# Route present?
route print -4 | findstr 192.168.49

# VM reachable?
ping <ubuntu-vmnet-ip>

# Full chain working?
curl.exe -k -i -u traefik:traefik -H "Host: traefik.dev.local" https://192.168.49.100 --max-time 10
```

### In the browser:

**Option A** — open Firefox **inside the VM** (XFCE desktop):
```
https://traefik.dev.local
https://grafana.dev.local
https://prometheus.dev.local
https://alertmanager.dev.local
https://keycloak.dev.local
```

**Option B** — open these URLs in a browser **on Windows**.

---

## Recommendations

- Ask whether a VM snapshot/export can be shared — saves 90% of this pain
  for the next person.
- **Consider Option A as the default recommendation** — it avoids all
  Windows↔VM networking and TLS trust complexity entirely, at the cost of
  only a lightweight graphical environment (XFCE) inside the VM.
- Every colleague may have different VMware network settings (VMnet
  subnets differ per machine) — adjust the subnet placeholders to your own
  situation (only relevant for Option B).
- Reserve time for the Microsoft Defender/TLS-inspection issue if using
  corporate laptops **and** choosing Option B — not fixable yourself, no
  reason to panic.
- Work through the sections in order (GUI setup → choose access path → TLS
  → memory → reboot persistence) for a from-scratch setup.

