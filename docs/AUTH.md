# Authentication using OIDC

The api-server is configured to authenticate with the idp (keycloak) using
client-id *kubernetes*. Doing so allows to control access to api-server
resources using Kubernetes RBAC.

## Overview

1. Keycloak issues an OIDC id-token for a user (e.g. fred, wilma, barney, betty)
2. `kubectl` (via the `oidc-login` plugin, see `scripts/create-oidc-kubeconfigs.sh`)
   presents that token to the API-server
3. The API-server validates the token against its own `--oidc-*` configuration
4. RBAC (see `environments/dev/security/rbac.yaml`) authorizes the request based
   on the username/groups claims extracted from the token

All four steps must work independently — a failure in step 3 (API-server config)
produces the exact same symptom (`401 Unauthorized`) as a failure in step 1
(bad Keycloak credentials), which makes this stack easy to misdiagnose. See
the troubleshooting section below if you hit this.

## API-server OIDC configuration

The kube-apiserver requires these flags to accept and validate OIDC tokens:

| Flag                      | Value                                                            |
|----------------------------|-------------------------------------------------------------------|
| `--oidc-issuer-url`       | `https://keycloak.dev.local/realms/me-yoda`                      |
| `--oidc-client-id`        | `kubernetes`                                                      |
| `--oidc-username-claim`   | `preferred_username`                                              |
| `--oidc-groups-claim`     | `groups`                                                          |
| `--oidc-ca-file`          | path to Keycloak's CA cert, mounted into the apiserver container |

Important: these flags are not applied automatically and are not guaranteed
to persist across every minikube start/stop/delete cycle. If
`kubectl --context=<user> get pods` fails with:

    error: You must be logged in to the server (Unauthorized)

First verify whether the flags are actually present on the running API-server:

    kubectl get pod -n kube-system kube-apiserver-minikube -o yaml | grep -i oidc

If this returns nothing, the flags were lost (or never applied) and must be
reapplied:

    # 1. Copy the Keycloak CA cert into a path minikube mounts into the
    #    apiserver container automatically
    minikube cp ca/keycloak-ca.crt /var/lib/minikube/certs/keycloak-ca.crt

    # 2. Restart the control-plane with the OIDC flags
    minikube start \
      --extra-config=apiserver.oidc-issuer-url=https://keycloak.dev.local/realms/me-yoda \
      --extra-config=apiserver.oidc-client-id=kubernetes \
      --extra-config=apiserver.oidc-username-claim=preferred_username \
      --extra-config=apiserver.oidc-groups-claim=groups \
      --extra-config=apiserver.oidc-ca-file=/var/lib/minikube/certs/keycloak-ca.crt

    # 3. Verify
    kubectl get pod -n kube-system kube-apiserver-minikube -o yaml | grep -i oidc

This restarts the control-plane components only (API-server, controller-manager,
scheduler) — not the whole node. Existing workloads (Traefik, Keycloak,
Grafana, etc.) are not affected and keep running.

### Version note: Keycloak issuer URL format

Keycloak changed its realm URL structure starting from v17:

- Pre-v17: https://keycloak.dev.local/auth/realms/me-yoda
- v17+:    https://keycloak.dev.local/realms/me-yoda

Make sure --oidc-issuer-url matches the format of whichever Keycloak version
is actually deployed (check the Helm chart's appVersion). A mismatch here
produces a different error than a missing CA (typically an OIDC discovery
failure rather than "invalid bearer token"), so check both if things don't
line up.

## Testing with demo users

    ./scripts/create-oidc-kubeconfigs.sh
    kubectl --context=oidc-user get pods -A

This triggers an interactive browser login (Keycloak hosted login page). The
login callback uses localhost:8000 — this only works if the browser used
to log in runs on the same machine as the kubectl process. On a headless
VM, this means running the command from a desktop session with a browser
installed (e.g. the VM's XFCE desktop + Firefox), not from a plain SSH session
without X-forwarding.

A successful result looks like one of:

    No resources found in default namespace          # authenticated + authorized, just no pods there
    NAME    READY   STATUS    RESTARTS   AGE          # authenticated + authorized, pods listed
    Error from server (Forbidden): ...                # authenticated, but RBAC correctly denies access

All three are "working" outcomes. The only failure case is:

    error: You must be logged in to the server (Unauthorized)

which means authentication itself failed — see the troubleshooting steps above.

## Known infrastructure interactions

If you're also seeing intermittent "no route to host" or flapping
LoadBalancer IPs for *.dev.local hostnames while testing this, that is
not an OIDC issue — see your provider's troubleshooting guide (e.g.
providers/windows-vm/README.md) for MetalLB/minikube tunnel conflicts,
which produce "dial tcp ...: connect: no route to host" errors that look
superficially similar but have a completely different root cause.

## todo's

- [x] the oidc confs
- [x] script to generate user kube configs
- [ ] check for kubelogin (auth plugins)
- [x] add the rbac's
