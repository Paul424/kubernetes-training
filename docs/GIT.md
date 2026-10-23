# Git

Git is available on Ubuntu by default but you need to do some additional configs to work with git (github)

## Create account

Create an account on github; or re-use one you already have.

## Create a PAT

There are various options to authenticate to github, here we use a PAT (fine-grained) which you need to create for yourself on [github developer settings](https://github.com/settings/personal-access-tokens)

Make sure you assign following permissions:
- Read and Write access to code

## Credential helper

Add a credential helper to remember credentials.

```
git config --global credential.helper store
```

## Setup clone

For this training we are using one of Paul's public repositories, setup a clone:
```
git clone https://github.com/Paul424/kubernetes-training.git
```
