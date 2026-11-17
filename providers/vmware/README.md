# VM as Development Environment from CloudNL

Create a new VM with following specs:

1. ISO: Ubuntu Desktop 26.04LTS
2. Memory: 32GB
3. CPU with +/- 12 cores
4. Storage: 512GB
5. Networking: single nic, DHCP or static IP, internet connected
6. Add the VMware tools (for clipboard sharing etc...) 
7. Enable VT-x is enabled
8. The virtual graphics drivers requires 256MB, otherwise dynamic scaling isn't working.

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

### Switch off sleep mode

When Ubuntu falls into sleep mode / screen blank, the webconsole doesn't work any more and you need to reboot the machine.

```
gsettings set org.gnome.desktop.session idle-delay 0
gsettings set org.gnome.desktop.screensaver lock-enabled false
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing'
```

## Access

Use the VMWare Remote Console (with the basic web console there is no dynamic scaling)

## Network activation

We ran into an issue using static network configuration, the network could not be activated. The solution was to remove the link completely and to redefine it using a static IP address, gw and `8.8.8.8` for the DNS.
