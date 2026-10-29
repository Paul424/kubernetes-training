# Kubernetes Training - environment

This repository holds a baseline Kubernetes environment which we can use to get familiar with Linux and Kubernetes basics. The intention is to simplify the preparation and setup so we start of with a working Kubernetes cluster.

## Topics

### included

1. Linux / tools and terminal
2. VSCode (IDE) /w copilot
3. Dockerized Kubernetes cluster (minikube)
4. Kubernetes basics like working with the KRM
5. IaC and GitOps
6. CNI (networking), CSI (storage) and ingress
7. Crt's, auth rbac and keycloak
8. Observability /w Prometheus and Grafana
9. 

### Topics excluded

1. Tunneling; yes we can work with headless VM's and expose apps using a tunnel (and use foxy proxy to access apps over a SOCKS5 tunnel), but it only makes it more complicated, not just the tunnel setup but also doing DNS workarounds on an additional level.
2. Wsl; even though we can spin a similar setup on our (Windows based) office equipment using wsl it is left out intentionally because it adds complexity, for instance to fine tune wsl setup to enable container platform and wsl is headless meaning you need to tunnel your apps to the browser running on Windows.

## Development Environment Provider

We use a VM from [CloudNL / VMware](./providers/vmware/README.md) as the development environment, please see the README for a guideline how to configure and operate.

Then continue on your VM with this guide.

## Prerequisites

Following tools are required, install all of these. When possible just pick a prebuild binary and move it into the `/usr/local/bin` which is often easier than to use yet another package manager.

1. [docker](./docs/DOCKER.md)
2. [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/)

    For instance:
    ```
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    chmod +x ./kubectl
    sudo mv ./kubectl /usr/local/bin/
    ```

3. [kubelogin plugin](https://github.com/int128/kubelogin/releases)

    For instance:
    ```
    curl -L https://github.com/int128/kubelogin/releases/download/v1.36.4/kubelogin_linux_amd64.zip -o kubelogin.zip && \
      unzip -p kubelogin.zip kubelogin > kubectl-oidc_login && \
      sudo install kubectl-oidc_login /usr/local/bin/ && \
      rm kubelogin kubelogin.zip
    ```

4. [minikube](https://minikube.sigs.k8s.io/docs/start/?arch=%2Flinux%2Fx86-64%2Fstable%2Fbinary+download)
    
    For instance:
    ```
    curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-amd64
    sudo install minikube-linux-amd64 /usr/local/bin/minikube && rm minikube-linux-amd64
    ```
5. [flux](https://fluxcd.io/flux/installation/)

    For instance
    ```
    curl -s https://fluxcd.io/install.sh | sudo bash
    ```

6. [sops](https://getsops.io/docs/installation/)

    For instance
    ```
    wget https://github.com/getsops/sops/releases/download/v3.13.3/sops-v3.13.3.linux.amd64
    sudo install sops-v3.13.3.linux.amd64 /usr/local/bin/sops && rm sops-v3.13.3.linux.amd64
    ```
7. [git](./docs/GIT.md)
8. [VSCode](https://code.visualstudio.com/thank-you?dv=linux64_deb&build=stable)

    For instance
    ```
    # Download .deb using the link and then:
    sudo dpkg -i ~/Downloads/code_1.143.1-172....deb
    ```
9. [k9s](https://github.com/derailed/k9s/releases)

    For instance
    ```
    curl -fsSL https://github.com/derailed/k9s/releases/download/v0.51.0/k9s_Linux_amd64.tar.gz | sudo tar -xz -C /usr/local/bin k9s
    ```
10. [yq](https://github.com/mikefarah/yq/releases/tag/v4.54.1)

    For instance:
    ```
    curl -fsSL https://github.com/mikefarah/yq/releases/download/v4.54.1/yq_linux_amd64.tar.gz | sudo tar -xzvf - -C /usr/local/bin --transform='s/yq_linux_amd64/yq/' ./yq_linux_amd64
    ```


## Kubernetes Provider

We like to have a working Kubernetes cluster /w .kube/config as quickly and simple as possible. This training material will run on any Kubernetes cluster, if you run your own on a homelab, or managed in cloud. All of these options can be seen as a "kubernetes provider". For this training we focus on minikube which can spin (and wipe) Kubernetes cluster in just seconds. This is done by running preconfigured Kubernetes container images on a container runtime (we use simply docker).

The benefit of using something like minikube is that you can make development cycles very quickly and any insight material you want to inspect runs locally.

See [minikube guideline](./providers/minikube/README.md) how to spin new clusters.

## Test Kube API

Confirm you have a working Kubernetes cluster by running following commands

```
$ kubectl config get-contexts

CURRENT   NAME       CLUSTER    AUTHINFO   NAMESPACE
*         minikube   minikube   minikube   default

$ kubectl get nodes 
NAME       STATUS   ROLES           AGE     VERSION
minikube   Ready    control-plane   6m46s   v1.37.0

$ kubectl describe nodes minikube
Name:               minikube
Roles:              control-plane
Labels:             beta.kubernetes.io/arch=amd64
                    beta.kubernetes.io/os=linux
                    <...>
Annotations:        csi.volume.kubernetes.io/nodeid: {"hostpath.csi.k8s.io":"minikube"}
                    node.alpha.kubernetes.io/ttl: 0
                    <...>
Addresses:
  InternalIP:  192.168.49.2
  Hostname:    minikube
Capacity:
  cpu:                4
  ephemeral-storage:  67818168320
  hugepages-2Mi:      0
  memory:             16372620Ki
  pods:               110
Allocatable:
  cpu:                4
  ephemeral-storage:  67818168320
  hugepages-2Mi:      0
  memory:             16372620Ki
  pods:               110
System Info:
  Machine ID:                 b7566eefbea02b7ce85821e86a97158b
  System UUID:                ce0011db-21c5-4fa8-b062-22555d58ca0a
  Boot ID:                    8d5eb2df-b44f-41b2-9a8f-9767f5c6e6fd
  Kernel Version:             7.0.0-38-generic
  OS Image:                   Debian GNU/Linux 12 (bookworm)
  Operating System:           linux
  Architecture:               amd64
  Container Runtime Version:  docker://29.7.2
  Kubelet Version:            v1.37.0
PodCIDR:                      10.244.0.0/24
PodCIDRs:                     10.244.0.0/24
Allocated resources:
  (Total limits may be over 100 percent, i.e., overcommitted.)
  Resource           Requests     Limits
  --------           --------     ------
  cpu                1200m (30%)  200m (5%)
  memory             370Mi (2%)   370Mi (2%)
  ephemeral-storage  0 (0%)       0 (0%)
  hugepages-2Mi      0 (0%)       0 (0%)
Events:
```

## Sops setup (one time only)

Secrets on the Kubernetes cluster are encrypted using sops; for this we need to setup a gpg key (once) which is then shared with the whole team.

To setup (once) see [sops setup guide](./docs/SOPS.md)

To import an existing (used) gpg key see [sops how to import gpg key](./docs/SOPS.md#Import-an-existing-gpg-key)

## Provide confs (credentials)

```
export REGISTRY_UPSTREAM_USERNAME=<your-github-account>
export REGISTRY_UPSTREAM_PAT=<your-pat-like-github_pat_1234567890>
```

## Bootstrap

```
bash ./scripts/bootstrap.sh
```

## Monitor

After a few minutes services should be up and running. Check the status of following relevant resources:

```
# 1. The GitRepository from which desired state is read
kubectl get gitrepositories -A
NAMESPACE   NAME                  URL                                                  AGE    READY   STATUS
env         kubernetes-training   https://github.com/Paul424/kubernetes-training.git   150m   True    stored artifact for revision 'main@sha1:3a5f6d330c5e52d5a073dcc2a67bc7ef428bcf04'

# 2. The state of (top level) environment Kustomizations
kubectl get kustomization -A
NAMESPACE   NAME                AGE    READY   STATUS
env         env-observability   151m   True    Applied revision: main@sha1:3a5f6d330c5e52d5a073dcc2a67bc7ef428bcf04
env         env-security        151m   True    Applied revision: main@sha1:3a5f6d330c5e52d5a073dcc2a67bc7ef428bcf04

# 3. State of lower level HelmReleases
kubectl get helmrelease -A
NAMESPACE    NAME                    AGE   READY   STATUS
monitoring   kube-prometheus-stack   10m   True    Helm install succeeded for release monitoring/kube-prometheus-stack.v1 with chart kube-prometheus-stack@85.0.1
```

## Control

From the commandline you are control gitops operations:

```
# Fetch latest updates from the (git) upstream + trigger a reconcile for the observability environment.
flux reconcile kustomization -n env env-observability --with-source

# Suspend / Resume reconcilers
flux suspend helmrelease -n monitoring kube-prometheus-stack
flux resume helmrelease -n monitoring kube-prometheus-stack
```

## Access

Find the (external) IP on which the LB is exposing:

```
kubectl get svc -n traefik
NAME      TYPE           CLUSTER-IP       EXTERNAL-IP      PORT(S)                      AGE
traefik   LoadBalancer   10.101.191.208   192.168.49.100   80:30617/TCP,443:32008/TCP   49s
```

Add the hostnames to your /etc/hosts as fake DNS service

```
192.168.49.100 traefik.dev.local
192.168.49.100 grafana.dev.local
192.168.49.100 prometheus.dev.local
192.168.49.100 alertmanager.dev.local
192.168.49.100 keycloak.dev.local
```

### Endpoints and credentials

1. [traefik dashboard](https://traefik.dev.local/dashboard/). Credentials: traefik / traefik
2. [Grafana](https://grafana.dev.local/). Credentials: user / password
3. [Prometheus](https://prometheus.dev.local/). Credentials: user / password
4. [AlertManager](https://alertmanager.dev.local/).

### Authentication (OIDC)

Bootstrapping is done using the default (admin) user, however part of the bootstrapping is to setup 4 demo users which have restricted access as configured in Keycloak.

| Username | Password | Groups | Roles |
| --- | ----------- | --- |
| fred | fred | senior, team-yellow, platform administrators  | platform-administrators (cluster-admins) |
| wilma | wilma | medior, team-sustaining, infrastructure operator | monitoring-developers, networking-developers |
| barney | barney | junior, team-sustaining, application operators | *app*-developers |
| betty | betty | senior, team-ops, network-engineer, kubernetes-engineer | platform-administrators |

To operate as-a-user simply switch to the predefined (oidc-user) context and authenticate to keycloak.

```
kubectl get nodes --context oidc-user

<login to keycloak as user fred>

NAME       STATUS   ROLES           AGE   VERSION
minikube   Ready    control-plane   99m   v1.37.0

kubectl auth whoami --context oidc-user
ATTRIBUTE                                           VALUE
Username                                            fred
Groups                                              [neuvector headlamp neuvector-admins platform-administrators offline_access uma_authorization monitoring-admins monitoring default-roles-me-yoda headlamp-admins system:authenticated]
Extra: authentication.kubernetes.io/credential-id   [JTI=161f38cd-bc84-8cbd-81d2-0e92b4d2db20]

kubectl auth can-i delete secret -n monitoring --context oidc-user
yes

<open https://keycloak.dev.local/realms/me-yoda/protocol/openid-connect/logout and confirm logout to keycloak>

# Now clean the cached tokens (or wait for a few minutes)
rm -rf ~/.kube/cache/oidc-login

kubectl get nodes --context oidc-user

<login to keycloak as user wilma>

Wordt geopend in een bestaande browsersessie.
Error from server (Forbidden): nodes is forbidden: User "wilma" cannot list resource "nodes" in API group "" at the cluster scope

kubectl auth whoami --context oidc-user
ATTRIBUTE                                           VALUE
Username                                            wilma
Groups                                              [neuvector headlamp networking-developers offline_access uma_authorization monitoring-viewers monitoring-developers monitoring neuvector-viewers headlamp-viewers default-roles-me-yoda system:authenticated]
Extra: authentication.kubernetes.io/credential-id   [JTI=9c3d2879-1a0f-386a-144a-794fcbc6b682]

kubectl auth can-i delete secret -n monitoring --context oidc-user
no
```