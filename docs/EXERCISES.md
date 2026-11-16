# Exercises

This document contains a number of exercises designed to help you become familiar with the Kubernetes stack as configured in this repository. Each participant in the training is expected to complete the exercises and to deliver a **logbook** in the docs/scratchpad directory. The logbook allows to learn from eachother's solutions and mistakes and also we can use it in team sessions where we can discuss technical topics. Finally there are a few bonus exercises; these are optional.

1. Kubernetes basics

    Admin access to Kubernetes clusters is done using the tool kubectl. Cluster config is setup in *~/.kube/config* where typically multiple (parallel) configs are defined. You address a specific config using the *--context* argument.

    1.1 Review the kube config on your setup (cat ~/.kube/config), how many clusters are defined? And how many users are defined? What is the difference (between the users)?

    1.2 USe kubectl to list the contexts (within the config subparser, use *kubectl config --help* to get going)

    1.3 List the nodes using kubectl with both contexts (for oidc use fred/fred); what is the difference?
    
    Kubernetes is a container orchestration framework and the *pod* is used to manage deployments. A pod holds one or more containers which share networking, storage and allocations / deployment. Working with Kubernetes means you will be monitoring pod status a lot and also analysing why a pod fails.

    1.4 Describe a few pod details (kubectl describe) and review the Conditions field.

    1.5 Now describe the same pods and review the Events. What is the difference between conditions and events?

    1.6 Fetch the pod logs (for the prometheus-kube-prometheus-stack-prometheus-0 pod)

    1.7 Now try to tail the same pod logs

    1.8 The pod holds 2 containers, fetch the logs from each container seperately.

    This stack uses flux for GitOps. This means that we define the expected state of the cluster in a git repository (the versioned manifests in the environments directory) and flux controllers running on the cluster pull in the desired state and continuously review and update the cluster state to match the expected state.

    1.9 Review the GitRepositories (CRD), if you have troubles finding the correct resource (kind) you can always list all the installed custom resources: *kubectl get crds*. This time do not *describe* the resource but *get* the resource using yaml output (-o yaml). What is the upstream (git repository)? And how does the controller authenticate to the git service? This *ref* is a very common concept in Kubernetes and ties resources together.

    1.10 List the Kustomizations and their status.

    1.11 Now list the HelmReleases, what is the difference between a flux HelmRelease and Kustomization? Which one would you prefer and why?

    1.12 Trigger a reconcile for a Kustomization including it's (source) dependency: *flux reconcile kustomization -n env env-observability --with-source*, why would you use this?

    1.13 Suspend the HelmRelease: *flux suspend helmrelease -n monitoring kube-prometheus-stack* now scale the Grafana deployment to 0 replicas *kubectl scale deployment -n monitoring kube-prometheus-stack-grafana --replicas 0* and observe Grafana is really gone and isn't restored.

    1.14 Now resume the HelmRelease *flux resume helmrelease -n monitoring kube-prometheus-stack* and observe Grafana is restored.

    1.15 When would you suspend / resume Kustomizations or HelmReleases?

2. Observability

    2.1 This "stack" comes with a whole series of rules (for instance ), can you pinpoint where the rules are defined? So what is the (upstream) source of these rules?

    2.2 Search for the alert "NodeFilesystemFilesFillingUp" in the Prometheus console. Locate the query and try to explain it. Also run the query and see it there are any matches.

    2.3 In the Prometheus console inspect target health, you will see that the controller-manager is down (connection refused), let's dive in and start with the ServiceMonitor (kube-prometheus-stack-kube-controller-manager); this resource is part of the monitoring stack and tells the Prometheus operator to setup scraping configs (see Status -> Configuration in the Prometheus console) for any Service matching the spec. Search for the config (kube-prometheus-stack-kube-controller-manager/0) and review the relabel_configs and metric_relabel_configs. Figure out how raw labels for a discovered service are transformed into a target. A very usefull tool is [the relabeler](https://relabeler.promlabs.com/) but nowadays a transformation overview is build-in by Prometheus, navigate to the Service Discovery and filter for controller-manager; on the left are the raw labels, right is the result. Try to take the raw labels and paste then into the tool and confirm you get the same output.

    2.4 Failing scrape targets is very common and needs constant attention. Figure out what the problem is here, is it a crt/ca issue? firewall issue? rbac issue? istio issue? Try to expose the metrics endpoint using k9s and open it in the browser.

3. Networking / Security

    Apps (or containers) running on Kubernetes are deployed as pods on a pod-(virtual)-network. The purpose of this pod network is to enable pods to interact securely with eachother which includes inter-node traffic. Kubernetes comes with the concept of the CNI (API or framework) which is an abstraction; it allows to switch between network backends just by configuration.

    3.1 Which CNI are we using? And is this an iptables based solution of eBPF based solution?

    3.2 Try to reconfigure / redeploy the stack using eBPF (Calico) and also try Cilium (eBPF). What is the difference; why would you prefer one over the other?

    3.3 NetworkPolicy is a build-in Kubernetes API to enable firewalling with the cluster. If you inspec the currently enabled policies you will only see some items for flux and keycloak, nothing for Prometheus. Reconfigure observability to enable network-policies in Kubernetes style as supported by the chart. Once enabled confirm you can still access Grafana. Inspect the newly added policies and use an [online policy editor](https://editor.networkpolicy.io/editor?tutorial=main) to understand the components.
    
    3.4 Continued from 3.3.... suspend the kube-prometheus-stack HelmRelease (use flux cli for this) and then remove a NetworkPolicy that allows the ingress traffic to the Grafana pod. Then confirm you receive timeouts trying to access the service. See if you can get a log somehow to capture blocked attempts, these are often CNI specific.

    By default pods / services are running on virtual networks are these are not reachable from outside. Kubernetes provides a few patterns to *expose* a service beyond the boundary of the Kubernetes cluster (making it accessible from outside), these options include: port-forward, nodeport, loadbalancer and ingress/gateway. Notice the latter actually isn't a 4th technical solution but the service delegates the exposure of it's service to an ingress-controller which needs to use one of the 3 options by itself.

    3.5 Expose the Grafana service using port-forward *kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3333:80* and access it's metrics API using your browser (http://localhost:3333/metrics). Also try to port-forward the same service using k9s and also try to expose the pod port directly (instead of it's service). When would you use port-forward?

    3.6 Review the services we are running on the cluster and find the one having type: LoadBalancer. Inspect the status of the service and find the hint where the ip (vip) is assigned to the service. In this (minikube) stack we are running metallb as a LoadBalancer provider; it's controllers are watching services for type: LoadBalancer and assign an ip from its given cidr. Then it's speakers announce the exposed service to the network so the router knows how to establish the connection when such request comes. When would you use LoadBalancer, and when would you not use it?

    3.7 The final option is NodePort (which this stack doesn't use). Can you investigate how NodePort works? When would you use it? And mention at least one drawback.

    3.8 Review the Ingress resources on the cluster. Specifically inspect the tls field, who owns the crt used for the ingress? Trace the crt to it's origin, how is it signed and by whom?

    A networking issue that is seen often is one where a service isn't reachable with a timeout or just with an error. We will use this stack to simulate an issue and try to investigate the root cause.

    3.9 Stop Grafana by running following two commands: *flux suspend helmrelease -n monitoring kube-prometheus-stack* and *kubectl scale deployment -n monitoring kube-prometheus-stack-grafana --replicas 0*, next access the service (*curl -Ik https://grafana.dev.local*) and inspect the result, what does the status code mean? If you are not familiar with http status codes, investigate the most common code, this is helpfull debugging network issue's. Also inspect the Traefik logs, how does this help with your analysis?

    3.10 [BONUS] Extend the networking kustomization with deployment of istio in STRICT mode. Then also add a simple httpbin deployment within a new httpbin ns, and make sure the app runs injected. Try to access the app using a new Ingress resource backed by Traefik; this doesn't work, why? Inspect the possible solution directions and compare these. Implement ingress with the istio ingress gateway as the controller (so enable the ingress controller, expose it's Service using type LoadBalancer, add the /etc/hosts mappings, have the controller add the route using VirtualService).
