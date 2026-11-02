# Exercises

1. Observability

    1.1 This "stack" comes with a whole series of rules (for instance ), can you pinpoint where the rules are defined? So what is the (upstream) source of these rules?

    1.2 Search for the alert "NodeFilesystemFilesFillingUp" in the Prometheus console. Locate the query and try to explain it. Also run the query and see it there are any matches.

    1.3 In the Prometheus console inspect target health, you will see that the controller-manager is down (connection refused), let's dive in and start with the ServiceMonitor (kube-prometheus-stack-kube-controller-manager); this resource is part of the monitoring stack and tells the Prometheus operator to setup scraping configs (see Status -> Configuration in the Prometheus console) for any Service matching the spec. Search for the config (kube-prometheus-stack-kube-controller-manager/0) and review the relabel_configs and metric_relabel_configs. Figure out how raw labels for a discovered service are transformed into a target. A very usefull tool is [the relabeler](https://relabeler.promlabs.com/) but nowadays a transformation overview is build-in by Prometheus, navigate to the Service Discovery and filter for controller-manager; on the left are the raw labels, right is the result. Try to take the raw labels and paste then into the tool and confirm you get the same output.

    1.4 Failing scrape targets is very common and needs constant attention. Figure out what the problem is here, is it a crt/ca issue? firewall issue? rbac issue? istio issue? Try to expose the metrics endpoint using k9s and open it in the browser.

2. Networking / Security

    2.1 Which CNI are we using? And is this an iptables based solution of eBPF based solution?

    2.2 Try to reconfigure / redeploy the stack using eBPF (Calico) and also try Cilium (eBPF). What is the difference; why would you prefer one over the other?

    2.3 NetworkPolicy is a build-in Kubernetes API to enable firewalling with the cluster. If you inspec the currently enabled policies you will only see some items for flux and keycloak, nothing for Prometheus. Reconfigure observability to enable network-policies in Kubernetes style as supported by the chart. Once enabled confirm you can still access Grafana. Inspect the newly added policies and use an [online policy editor](https://editor.networkpolicy.io/editor?tutorial=main) to understand the components.
    
    2.4 Continued from 2.3.... suspend the kube-prometheus-stack HelmRelease (use flux cli for this) and then remove a NetworkPolicy that allows the ingress traffic to the Grafana pod. Then confirm you receive timeouts trying to access the service. See if you can get a log somehow to capture blocked attempts, these are often CNI specific.
    
    2.5 For those who dare :-) extend the networking kustomization with deployment of istio in STRICT mode. Then also add a simple httpbin deployment within a new httpbin ns, and make sure the app runs injected. Try to access the app using a new Ingress resource backed by Traefik; this doesn't work, why? Inspect the possible solution directions and compare these. Implement ingress with the istio ingress gateway as the controller (so enable the ingress controller, expose it's Service using type LoadBalancer, add the /etc/hosts mappings, have the controller add the route using VirtualService).

3. 
