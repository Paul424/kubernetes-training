#!/bin/bash
set -euxo pipefail

BASE=$(dirname $(dirname $(realpath $0)))

# private key (ECDSA P-256)
if [ ! -f "$BASE/ca/keycloak-ca.key" ]; then
    openssl ecparam -name prime256v1 -genkey -noout -out $BASE/ca/keycloak-ca.key
else
    echo "$BASE/ca/keycloak-ca.key already exists."
fi

# self-signed CA-certificaat, 10y valid
if [ ! -f "$BASE/ca/keycloak-ca.crt" ]; then
    openssl req -x509 -new -key $BASE/ca/keycloak-ca.key -sha256 -days 3650 \
    -subj "/CN=keycloak-ca" \
    -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -addext "subjectKeyIdentifier=hash" \
    -out $BASE/ca/keycloak-ca.crt
else
    echo "$BASE/ca/keycloak-ca.crt already exists."
fi

# check
openssl x509 -in $BASE/ca/keycloak-ca.crt -noout -subject -dates -ext basicConstraints,keyUsage