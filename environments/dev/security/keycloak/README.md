# Keycloak

From upstream:
- [chart artifacthub](https://artifacthub.io/packages/helm/bitnami/keycloak)
- [chart](https://github.com/bitnami/charts/tree/main/bitnami/keycloak)

## Realm

Keycloak (and the chart) provide a way to import a predefined realm (if it doesn't exist already) and this is what we are using in this stack.

## How the realm is pushed to the running keycloak instance

realm.json
   |
   | adhoc command to create / update secret
   |
keycloak-realm-secret.yaml
   |
   | enc.sh to encrypt secrets
   |
keycloak-realm-secret-enc.yaml
   |
   | flux to reconcile the resource
   |
keycloak-realm
   |
   | the secret is mounted in the pod and when kc starts it imports the realm
   |
keycloak

## Adhoc command to create / update secret

When updating the realm (json), run the following command to wrap it in a secret.
```
kubectl create secret generic keycloak-realm --from-file=realm.json=./environments/dev/security/keycloak/secrets/realm.json --dry-run=client -o yaml > ./environments/dev/security/keycloak/secrets/keycloak-realm-secret.yaml
```

## Exporting the users

From the kaycloak console you are export the realm but the users are missing. This is an adhoc option to export the users to a seperate json file. Run this within the keycloak container.

```
KC_DB=postgres \
KC_DB_USERNAME=bn_keycloak \
KC_DB_PASSWORD="$(cat /opt/bitnami/keycloak/secrets/db-password)" \
/opt/bitnami/keycloak/bin/kc.sh export \
  --dir /tmp/export \
  --realm master \
  --users different_files \
  --bootstrap-admin-username admin \
  --bootstrap-admin-password admin \
  --optimized
```
