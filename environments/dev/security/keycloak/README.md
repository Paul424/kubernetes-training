# Keycloak

From upstream:
- [chart artifacthub](https://artifacthub.io/packages/helm/bitnami/keycloak)
- [chart](https://github.com/bitnami/charts/tree/main/bitnami/keycloak)

## Update the realm

When updating the realm (json), run the following command to wrap it in a secret.
```
kubectl create secret generic keycloak-realm --from-file=realm.json=./environments/dev/security/keycloak/secrets/realm.json --dry-run=client -o yaml > ./environments/dev/security/keycloak/secrets/keycloak-realm-secret.yaml
```

## Export the users

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

I have no name!@keycloak-0:/$ KC_DB=postgres /opt/bitnami/keycloak/bin/kc.sh export --dir /tmp/export --realm me-yoda --users different_files --bootstrap-admin-username admin --bootstrap-admin-password admin

```
