# Minikube

Minikube was added as a provider to work with local gpu's (the gpu support in kind is very limited)

## Prerequisites

1. [minikube](https://minikube.sigs.k8s.io/docs/start/)
2. 

## Configure

See also [gpu support minikube](https://minikube.sigs.k8s.io/docs/tutorials/nvidia/)

1. Download drivers for the hw (e.g. NVIDIA RTX 3500 Ada) [Nvidia drivers](https://www.nvidia.com/en-us/drivers/)
2. Install [NVIDIA container toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)
3. Configure docker

```
nvidia-ctk runtime configure --runtime=docker --set-as-default
>>> INFO[0000] Wrote updated config to /etc/docker/daemon.json
systemctl restart docker
```

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
