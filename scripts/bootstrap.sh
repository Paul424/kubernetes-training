#!/bin/bash
set -euxo pipefail

BASE=$(dirname $(dirname $(realpath $0)))
CLUSTER_NAME=${1:-bb9};

SOPS_KEY_NAME="dev.local"

# Create the namespace for initial secrets
kubectl create namespace dev --dry-run=client -o yaml | kubectl apply -f -

# Export the SOPS key to the cluster
gpg --export-secret-key --armor "${SOPS_KEY_NAME}" | kubectl create secret generic sops-gpg -n dev --from-file=key.asc=/dev/stdin --dry-run=client -o yaml | kubectl apply -f -

# Git (private) repo credentials
kubectl create secret generic private-git -n dev \
    --from-literal=username=$REGISTRY_UPSTREAM_USERNAME \
    --from-literal=password=$REGISTRY_UPSTREAM_PAT \
    --dry-run=client -o yaml | kubectl apply -f -

# Deploy flux
kubectl apply -k $BASE/environments/dev/gitops

# Wait for the controllers
kubectl wait --for=condition=available --timeout "300s" -n flux-system "deployment/helm-controller"
kubectl wait --for=condition=available --timeout "300s" -n flux-system "deployment/kustomize-controller"
kubectl wait --for=condition=available --timeout "300s" -n flux-system "deployment/notification-controller"
kubectl wait --for=condition=available --timeout "300s" -n flux-system "deployment/source-controller"

# The top level reconciler
kubectl apply -k $BASE/environments/dev/env
