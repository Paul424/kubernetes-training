#!/bin/bash
set -euxo pipefail

BASE=$(dirname $(dirname $(realpath $0)))

function up_kc_config {
    # Create (update) a kube config context using OIDC
    #
    # Example: 
    #   kubectl --context barney get pods -A
    #   [OK]
    #
    #   kubectl --context barney delete pod -n kiali kiali-7ccd646bb-ltgxs
    #   Error from server (Forbidden): pods "kiali" is forbidden: User "https://keycloak.dev.local/auth/realms/me-yoda#barney" cannot delete resource "pods" in API group "" in the namespace "kiali"
    #
    #   kubectl --context fred delete pod -n kiali kiali-7ccd646bb-ltgxs
    #   pod "kiali-7ccd646bb-ltgxs" deleted from kiali namespace
    local USERNAME=${1};
    local CLUSTER_NAME=${2};
    local CLIENT_ID=kubernetes
    local ISSUER=https://keycloak.dev.local/realms/me-yoda
    local ENDPOINT=$ISSUER/protocol/openid-connect/token
    local CA_DATA=$(cat $BASE/ca/keycloak-ca.crt | base64 -w 0)
    local ID_TOKEN=$(curl -k -X POST $ENDPOINT \
        -d grant_type=password \
        -d client_id=$CLIENT_ID \
        -d username=$USERNAME \
        -d password=$USERNAME \
        -d scope=openid \
        -d response_type=id_token | jq -r '.id_token')
    local REFRESH_TOKEN=$(curl -k -X POST $ENDPOINT \
        -d grant_type=password \
        -d client_id=$CLIENT_ID \
        -d username=$USERNAME \
        -d password=$USERNAME \
        -d scope=openid \
        -d response_type=id_token | jq -r '.refresh_token')
    kubectl config set-credentials $USERNAME \
        --auth-provider=oidc \
        --auth-provider-arg=client-id=$CLIENT_ID \
        --auth-provider-arg=idp-issuer-url=$ISSUER \
        --auth-provider-arg=id-token=$ID_TOKEN \
        --auth-provider-arg=refresh-token=$REFRESH_TOKEN \
        --auth-provider-arg=idp-certificate-authority-data=$CA_DATA
    kubectl config set-context $USERNAME --cluster=$CLUSTER_NAME --user=$USERNAME
}

up_kc_config fred minikube
up_kc_config wilma minikube
up_kc_config barney minikube
up_kc_config betty minikube
