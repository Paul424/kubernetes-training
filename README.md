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

1. wsl; even though we can spin a similar setup on our (Windows based) office equipment using wsl it is left out intentionally because it adds complexity, for instance to fine tune wsl setup to enable container platform and wsl is headless meaning you need to tunnel your apps to the browser running on Windows.
2. Tunneling; yes we can expose apps using a tunnel (and have foxy proxy plugin access apps over a SOCKS5 tunnel), but it only makes it complicated, not just the tunnel setup but also doing DNS workarounds on an additional level.

## Development Environment Provider

We use a VM from [CloudNL / VMware](./providers/vmware/README.md) as the development environment, please see the README for a guideline how to configure and operate.

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

3. [minikube](https://minikube.sigs.k8s.io/docs/start/?arch=%2Flinux%2Fx86-64%2Fstable%2Fbinary+download)
    
    For instance:
    ```
    curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube && rm minikube-linux-amd64
    ```
4. [flux](https://fluxcd.io/flux/installation/)

    For instance
    ```
    curl -s https://fluxcd.io/install.sh | sudo bash
    ```

5. [sops](https://getsops.io/docs/installation/)

    For instance
    ```
    wget https://github.com/getsops/sops/releases/download/v3.13.3/sops-v3.13.3.linux.amd64
    sudo install sops-v3.13.3.linux.amd64 /usr/local/bin/sops && rm sops-v3.13.3.linux.amd64
    ```
6. 


## Kubernetes Provider

We like to have a working Kubernetes cluster /w .kube/config as quickly and simple as possible. This training material will run on any Kubernetes cluster, if you run your own on a homelab, or managed in cloud. All of these options can be seen as a "kubernetes provider". For this training we focus on minikube which can spin (and wipe) Kubernetes cluster in just seconds. This is done by running preconfigured Kubernetes container images on a container runtime (we use simply docker).

The benefit of using something like minikube is that you can make development cycles very quickly and any insight material you want to inspect runs locally.

See [minikube guideline](./providers/minikube/README.md) how to spin new clusters.

## Bootstrap
