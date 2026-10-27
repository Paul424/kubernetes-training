# Keycloak

From upstream:
- [chart artifacthub](https://artifacthub.io/packages/helm/bitnami/keycloak)
- [chart](https://github.com/bitnami/charts/tree/main/bitnami/keycloak)

## Update the realm

```
kubectl create secret generic keycloak-realm --from-literal=realm.json="$(yq -o=json ./environments/dev/security/keycloak/secrets/realm.yaml)" --dry-run=client -o yaml > ./environments/dev/security/keycloak/secrets/keycloak-realm-secret.yaml
```
