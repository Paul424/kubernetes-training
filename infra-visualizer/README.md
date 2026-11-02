# Infrastructure Stack Visualizer — Fase 1

Een webapplicatie die de Kubernetes-laag van je cluster visualiseert:
Node → Control Plane → Namespaces → Pods, in een interactieve, inklapbare graph.

De applicatie haalt live data op via de Kubernetes API — er is niets hardcoded.
Dit betekent dat de visualisatie **automatisch jouw eigen cluster-inhoud** toont,
ongeacht welke apps/namespaces jij hebt draaien.

## Voorvereisten

- Een werkend Kubernetes-cluster (bv. minikube)
- `kubectl` geconfigureerd met toegang tot dat cluster
- Traefik als Ingress-controller (of pas `ingress.yaml` aan voor jouw eigen setup)
- cert-manager geïnstalleerd (voor het TLS-certificaat)

## Installatie

### 1. Manifests toepassen

Als je via Flux/GitOps werkt, worden de manifests in
`environments/dev/observability/infra-visualizer/` automatisch opgepikt
zodra je ze commit en pusht naar je Git-repo.

Handmatig toepassen kan ook:

\`\`\`bash
cd environments/dev/observability
kubectl apply -k .
\`\`\`

### 2. Je eigen minikube-IP opzoeken

\`\`\`bash
minikube ip
\`\`\`

### 3. Hosts-file aanpassen (op je Windows-host, als Administrator)

Voeg deze regel toe aan `C:\Windows\System32\drivers\etc\hosts`:

\`\`\`
<jouw-minikube-ip> infra-visualizer.dev.local
\`\`\`

Bijvoorbeeld:

\`\`\`
192.168.49.100 infra-visualizer.dev.local
\`\`\`

### 4. Testen

Open in **Chrome** (Edge kan problemen geven met self-signed certificaten):

\`\`\`
https://infra-visualizer.dev.local
\`\`\`

Accepteer de certificaatwaarschuwing (self-signed certificate, net als je andere `*.dev.local`-apps).

## Image

De Docker image wordt publiek gehost op GitHub Container Registry:

\`\`\`
ghcr.io/deefthefreeze/infra-visualizer:latest
\`\`\`

Je hoeft dus **niet zelf te bouwen** — Kubernetes pullt de image automatisch.

## Zelf bouwen (optioneel, voor development)

Als je de broncode wilt aanpassen en een eigen image wilt bouwen:

\`\`\`bash
cd src
docker build -t infra-visualizer:latest .
minikube image load infra-visualizer:latest
\`\`\`

Pas daarna in `deployment.yaml` de regel `image:` en `imagePullPolicy: Never` aan
om je lokale image te gebruiken in plaats van de GHCR-versie.

## Architectuur

- **Backend:** Python/Flask + kubernetes-client, bevraagt live de K8s API
- **Frontend:** vis-network (via CDN), interactieve/inklapbare graph
- **RBAC:** read-only ClusterRole (alleen `get/list/watch` op nodes/pods/namespaces)
- **TLS:** self-signed Certificate via cert-manager, zelfde patroon als overige apps

## Roadmap

- **Fase 1 (dit):** Kubernetes-laag (Node/Control Plane/Pods)
- **Fase 2:** VM/Docker-laag via een host-agent
- **Fase 3-5:** nader te bepalen
