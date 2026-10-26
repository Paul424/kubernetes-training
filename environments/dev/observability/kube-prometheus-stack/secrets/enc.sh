#!/bin/bash

# set -euxo pipefail

BASE=$(dirname $(realpath $0))

for f in $BASE/*.yaml $BASE/*.yml; do
    [ -e "$f" ] || continue

    if [[ "$f" == */kustomization.yaml ]]; then
        echo "Skip $f"
        continue
    fi

    if [[ "$f" == *-enc.yaml ]]; then
        echo "Skip $f"
        continue
    fi

    of="${f%.*}-enc.yaml"
    echo "Encrypt $f -> $of"
    
    sops --encrypt "$f" > "$of"

    if ! [ $? -eq 0 ]; then
        echo "Error when encrypting $f"
        rm -f "$of"
    fi
done
