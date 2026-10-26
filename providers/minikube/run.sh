#!/bin/bash

set -euxo pipefail

minikube start \
    --nodes=1 \
    --driver=docker \
    --container-runtime=docker \
    --cpus=4 \
    --memory=12384 \
    --cni=calico \
    --subnet=192.168.49.0/24

# minikube config set cpus 16
# minikube config set memory 16384
# minikube node add

# minikube config set cpus 8
# minikube config set memory 16384
# minikube node add

minikube ip
minikube addons enable metallb
# minikube addons configure metallb
# minikube addons enable storage-provisioner
minikube addons enable csi-hostpath-driver

kubectl get nodes
