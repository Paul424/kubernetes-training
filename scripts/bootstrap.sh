#!/bin/bash
set -euxo pipefail

BASE=$(dirname $(dirname $(realpath $0)))

SOPS_KEY_NAME="dev.local"

# Create the namespace for initial secrets
kubectl create namespace env --dry-run=client -o yaml | kubectl apply -f -

# Export the SOPS key to the cluster
gpg --export-secret-key --armor "${SOPS_KEY_NAME}" | kubectl create secret generic sops-gpg -n env --from-file=key.asc=/dev/stdin --dry-run=client -o yaml | kubectl apply -f -

# Git (private) repo credentials
kubectl create secret generic private-git -n env \
    --from-literal=username=$REGISTRY_UPSTREAM_USERNAME \
    --from-literal=password=$REGISTRY_UPSTREAM_PAT \
    --dry-run=client -o yaml | kubectl apply -f -

# Push the keycloak-ca to the cluster (so cert-manager can generate leaf crts upon request by ingress resource annotations)
kubectl create namespace keycloak --dry-run=client -o yaml | kubectl apply -f -
kubectl -n keycloak create secret tls keycloak-ca-secret --cert=$BASE/ca/keycloak-ca.crt --key=$BASE/ca/keycloak-ca.key --dry-run=client -o yaml | kubectl apply -f -

# Deploy flux
kubectl apply -k $BASE/environments/dev/gitops

# Wait for the controllers
kubectl wait --for=condition=available --timeout "300s" -n flux "deployment/helm-controller"
kubectl wait --for=condition=available --timeout "300s" -n flux "deployment/kustomize-controller"
kubectl wait --for=condition=available --timeout "300s" -n flux "deployment/notification-controller"
kubectl wait --for=condition=available --timeout "300s" -n flux "deployment/source-controller"

# The top level reconciler
kubectl apply -k $BASE/environments/dev/env
