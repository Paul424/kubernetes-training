# Docker engine

## Install instructions

Follow these exact install instructions (which are taken from [install docker](https://docs.docker.com/engine/install/ubuntu/)).

### Setup the docker apt

```
# Add Docker's official GPG key:
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
```

### Install

```
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl status docker
sudo systemctl enable docker.service
sudo systemctl enable containerd.service
```

### Post install

```
sudo groupadd docker
sudo usermod -aG docker $USER
<reboot>
groups  # Should show that you are a member of the docker group
```

### Test

```
docker run hello-world
```
