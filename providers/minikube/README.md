# Minikube

## Setup

```
bash ./providers/minikube/run.sh

# And when you are done
minikube delete --all
```

## PVC

Use storage-class "" for PVC's.

The mounts are located within the nodes as a hostPath in following path:

```
$ minikube ssh
docker@minikube:~$ ls -alrt /var/lib/csi-hostpath-data/
total 16
drwxr-xr-x 23 root root 4096 Sep 28 13:47 ..
-rw-------  1 root root  381 Sep 28 13:52 state.json
drwxr-xr-x  3 root root 4096 Sep 28 13:52 .
drwxrwsr-x 15 root 1000 4096 Sep 28 13:53 dc2c0144-bb43-11f1-b89a-ae831c488d40
```
