import os
from flask import Flask, jsonify, render_template
from kubernetes import client, config

app = Flask(__name__)

CONTROL_PLANE_KEYWORDS = [
    "kube-apiserver", "etcd", "kube-scheduler",
    "kube-controller-manager", "kube-proxy", "coredns",
]


def load_k8s_config():
    """Gebruikt in-cluster config als we in een Pod draaien,
    anders de lokale kubeconfig (minikube-context)."""
    if os.getenv("KUBERNETES_SERVICE_HOST"):
        config.load_incluster_config()
    else:
        config.load_kube_config()


def is_control_plane_pod(pod_name):
    return any(keyword in pod_name for keyword in CONTROL_PLANE_KEYWORDS)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/topology")
def get_topology():
    load_k8s_config()
    v1 = client.CoreV1Api()

    # --- Nodes ---
    nodes_data = []
    for node in v1.list_node().items:
        conditions = {c.type: c.status for c in node.status.conditions}
        nodes_data.append({
            "name": node.metadata.name,
            "ready": conditions.get("Ready") == "True",
            "kubelet_version": node.status.node_info.kubelet_version,
            "os_image": node.status.node_info.os_image,
            "container_runtime": node.status.node_info.container_runtime_version,
        })

    # --- Pods ---
    control_plane_pods = []
    workload_pods = []

    for pod in v1.list_pod_for_all_namespaces().items:
        info = {
            "name": pod.metadata.name,
            "namespace": pod.metadata.namespace,
            "node": pod.spec.node_name,
            "status": pod.status.phase,
            "restarts": sum(
                cs.restart_count for cs in (pod.status.container_statuses or [])
            ),
        }
        if pod.metadata.namespace == "kube-system" and is_control_plane_pod(pod.metadata.name):
            control_plane_pods.append(info)
        else:
            workload_pods.append(info)

    namespaces = sorted({p["namespace"] for p in workload_pods})
    pods_by_namespace = {
        ns: [p for p in workload_pods if p["namespace"] == ns] for ns in namespaces
    }

    return jsonify({
        "nodes": nodes_data,
        "control_plane_pods": control_plane_pods,
        "namespaces": pods_by_namespace,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
