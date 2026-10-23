# VM as Development Environment from CloudNL

Create a new VM with following specs:

1. ISO: Ubuntu Desktop 26.04LTS
2. Memory: 64GB
3. CPU with +/- 12 cores
4. Storage: 512GB
5. Networking: single nic, DHCP or static IP, internet connected
6. Add the VMware tools (for clipboard sharing etc...) 
7. Enable VT-x is enabled

## Install

### Basic OS install

Just accept defaults through the wizard to complete the installation.

### Guest additions

Install the guest additions using:
```
sudo apt install -y open-vm-tools-desktop
```

### Run an upgrade
```
sudo apt-update
sudo apt-upgrade
```


## Network activation

We ran into an issue using static network configuration, the network could not be activated. The solution was to remove the link completely and to redefine it using a static IP address, gw and `8.8.8.8` for the DNS.
