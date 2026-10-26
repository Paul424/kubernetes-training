# Secrets Management using SOPS

## SOPS setup

### Generate a new gpg key (first time only)

```
gpg --batch --full-generate-key <<EOF
%no-protection
Key-Type: 1
Key-Length: 4096
Subkey-Type: 1
Subkey-Length: 4096
Expire-Date: 0
Name-Comment: "flux secrets"
Name-Real: "dev.local"
EOF

FP=$(gpg --fingerprint --with-colons "dev.local" | awk -F: '/^fpr:/ { print $10; exit }')
if [ -z "$FP" ]; then
    echo "Fingerprint not found"
    exit 1
else
    echo "Fingerprint: $FP"
fi

# Set the finger-print in the .sops.yaml config.
sed -i "s/pgp: .*/pgp: ${FP}/" .sops.yaml
```

### Export an existing gpg key

To share an existing gpg key with another machine:

Export the gpg key
```
gpg --list-secret-keys --keyid-format LONG  --armor "dev.local"

gpg --export-secret-key -a dev.local > ./asc/dev-local.asc
```

For convenience the key is [committed to this repository](../asc/dev-local.asc), obviously in a real-world-project the key needs to be shared securely within the team.

### Import an existing gpg key

Import the gpg key
```
gpg --import dev-local.asc
```

### Apply the key to the cluster

```
gpg --export-secret-key --armor "dev.local" | kubectl create secret generic sops-gpg -n dev --from-file=key.asc=/dev/stdin --dry-run=client -o yaml | kubectl apply -f -
```

## SOPS Wow

1. Decrypt secrets

```
sops --decrypt environments/base/common-bb-secret.enc.yaml > environments/base/common-bb-secret.yaml
```

2. Edit....
```
code environments/base/common-bb-secret.yaml
```

3. Encrypt secrets
```
sops --encrypt environments/base/common-bb-secret.yaml > environments/base/common-bb-secret.enc.yaml
```

## SOPS gpg key rotation

The simple approach (when doing a full redeployment) is to just:
1. Remove the old gpg key
```
gpg --delete-secret-and-public-key FINGERPRINT
```
2. Create a new gpg key
3. Take the fp to .sops
4. Encrypt all files
5. Export the new key to the cluster
