# Host Agent — VM & Docker metrics bridge

## Context

This service runs **directly on the Ubuntu VM host**, outside of the
Kubernetes cluster. It exists to solve a specific architectural problem:

A Pod running inside Kubernetes can query the Kubernetes API just fine
(nodes, pods, control plane status, etc.), but it has **no visibility**
into the infrastructure *underneath* the cluster — the VM itself, or the
Docker engine that minikube runs on top of. That data simply isn't exposed
through the Kubernetes API, because it lives one layer below it.

The Host Agent closes that gap: it's a small Flask service that exposes VM
and Docker metrics over HTTP, so that a Pod inside the cluster can reach
out and ask the VM host "how are you doing?" — something it otherwise
couldn't do.

```
┌─────────────────────────────────────────────┐
│ Ubuntu VM (host)                              │
│                                                │
│   Host Agent (this service, port 9000)        │
│     ↑ exposes: CPU/memory stats,              │
│       Docker container status                 │
│                                                │
│   ┌──────────────────────────────────────┐   │
│   │ Docker Engine                          │   │
│   │                                         │   │
│   │   ┌───────────────────────────────┐   │   │
│   │   │ minikube container (the node)   │   │   │
│   │   │                                   │   │
│   │   │   Pod: infra-visualizer           │   │
│   │   │     queries →  host.minikube     │   │
│   │   │     .internal:9000/host-info      │   │
│   │   └───────────────────────────────┘   │   │
│   └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## What it exposes

A single endpoint: `GET /host-info`

**Example response:**
```json
{
  "vm": {
    "cpu_percent": 8.8,
    "memory_percent": 27.9,
    "memory_total_gb": 15.57,
    "memory_used_gb": 4.37
  },
  "docker_containers": [
    {
      "name": "minikube",
      "status": "Up 59 minutes",
      "image": "gcr.io/k8s-minikube/kicbase:v0.0.51"
    }
  ]
}
```

## How a Pod reaches this service

Minikube (Docker driver) provides a special DNS name, resolvable **only
from within the cluster**, that points back to the VM host:

```
host.minikube.internal → 192.168.49.1 (Docker bridge gateway)
```

This is how the main dashboard (`infra-visualizer/src/app.py`) reaches
this agent — via `http://host.minikube.internal:9000/host-info`.

⚠️ **This DNS name does NOT resolve from the VM itself** — only from
inside a Pod. If you try to `curl`/`wget` this hostname directly on the
VM (outside the cluster), you'll get a `Name or service not known` error.
This is expected, not a bug — see the "Testing" section below for how to
test correctly depending on where you are.

## Running locally (manual, for development)

```bash
cd infra-visualizer/host-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

The service starts on `0.0.0.0:9000`.

### Testing from the VM itself
```bash
curl http://localhost:9000/host-info
```

### Testing from inside the cluster (the real use case)
```bash
kubectl run test-pod --image=busybox --rm -it --restart=Never -- sh
# inside the pod:
wget -O - http://host.minikube.internal:9000/host-info
```

## Dependencies

- **Flask** — minimal HTTP server
- **psutil** — cross-platform VM resource stats (CPU, memory)
- Docker CLI must be installed and accessible on the host (uses
  `docker ps` via `subprocess`)

See `requirements.txt` for exact pinned versions.

## Running as a persistent systemd service (recommended for ongoing use)

Rather than manually starting this in a terminal every time, run it as a
systemd service so it survives VM reboots — similar to the
`minikube-tunnel.service` approach documented in
[`providers/windows-vm/README.md`](../../providers/windows-vm/README.md).

```bash
sudo tee /etc/systemd/system/host-agent.service > /dev/null << 'EOF'
[Unit]
Description=Host Agent - VM and Docker metrics for Infrastructure Visualizer
After=docker.service network.target

[Service]
Type=simple
User=<username>
WorkingDirectory=/home/<username>/kubernetes-training/infra-visualizer/host-agent
ExecStart=/home/<username>/kubernetes-training/infra-visualizer/host-agent/venv/bin/python3 app.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable host-agent.service
sudo systemctl start host-agent.service
```

🔒 **PERSISTENT** — `systemctl enable` ensures this auto-starts on every
VM boot, so the dashboard's VM/Docker layer keeps working without manual
intervention.

**Fill in before use:**
- `<username>` → your own Linux username (check with `whoami`)

✅ **Verification**
```bash
sudo systemctl status host-agent.service
curl http://localhost:9000/host-info
```

## Known limitations

- **Single-node assumption**: this agent assumes it runs on the same VM
  that hosts the single minikube node. In a multi-node setup, each node's
  host would need its own agent instance, and the dashboard would need to
  know how to reach each one individually.
- **No authentication**: the `/host-info` endpoint is unauthenticated.
  This is acceptable for a local training environment, but would need to
  be addressed (e.g. a shared secret header, or restricting access via
  firewall rules) before using this pattern in any shared/production
  context.
- **Docker-driver specific**: the `host.minikube.internal` DNS resolution
  relies on minikube's Docker driver. Other drivers (e.g. `kvm2`,
  `hyperkit`) may expose the host differently or not at all.

## Roadmap / possible extensions

- Expose relevant systemd service status (e.g. `docker`, `kubelet`,
  `minikube-tunnel.service`) — ties back to the reboot-persistence
  troubleshooting covered in the Windows VM provider guide.
- Disk usage / uptime metrics.
- WebSocket support for push-based updates instead of polling.
