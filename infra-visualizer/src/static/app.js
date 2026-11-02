let network;
let nodesDataSet;
let edgesDataSet;
let topologyData;
let expandedNamespaces = new Set();
let expandedControlPlane = false;

async function loadTopology() {
  const res = await fetch("/api/topology");
  topologyData = await res.json();
  buildGraph();
}

function buildGraph() {
  const nodes = [];
  const edges = [];

  // Placeholders voor latere fases
  nodes.push({ id: "vm", label: "🖥️ Ubuntu VM\n(VMware)", level: 0, color: "#cfd8dc", shape: "box", font: { size: 16 } });
  nodes.push({ id: "docker", label: "🐳 Docker", level: 1, color: "#cfd8dc", shape: "box", font: { size: 16 } });
  edges.push({ from: "vm", to: "docker" });

  // Nodes
  topologyData.nodes.forEach((node) => {
    const nodeId = `node-${node.name}`;
    nodes.push({
      id: nodeId,
      label: `🖥️ ${node.name}\n${node.ready ? "✅ Ready" : "❌ NotReady"}\nk8s ${node.kubelet_version}`,
      level: 2,
      color: node.ready ? "#66bb6a" : "#ef5350",
      shape: "box",
      font: { size: 16, color: "#ffffff" },
    });
    edges.push({ from: "docker", to: nodeId });
  });

  // Control plane (inklapbaar)
  const cpCount = topologyData.control_plane_pods.length;
  nodes.push({
    id: "control-plane",
    label: `⚙️ Control Plane\n(${cpCount} pods)\n${expandedControlPlane ? "▼ klik om in te klappen" : "▶ klik om uit te klappen"}`,
    level: 3,
    color: "#ffb74d",
    shape: "box",
    font: { size: 14 },
  });
  topologyData.nodes.forEach((node) => edges.push({ from: `node-${node.name}`, to: "control-plane" }));

  if (expandedControlPlane) {
    topologyData.control_plane_pods.forEach((pod) => {
      const id = `cp-${pod.name}`;
      nodes.push({
        id,
        label: `${pod.name}\n${pod.status}`,
        level: 4,
        color: pod.status === "Running" ? "#ffe0b2" : "#ef9a9a",
        shape: "ellipse",
        font: { size: 12 },
      });
      edges.push({ from: "control-plane", to: id });
    });
  }

  // Namespaces (inklapbaar)
  Object.entries(topologyData.namespaces).forEach(([ns, pods]) => {
    const nsId = `ns-${ns}`;
    const isExpanded = expandedNamespaces.has(ns);
    nodes.push({
      id: nsId,
      label: `📦 ${ns}\n(${pods.length} pods)\n${isExpanded ? "▼" : "▶ klik om te openen"}`,
      level: 3,
      color: "#64b5f6",
      shape: "box",
      font: { size: 14, color: "#ffffff" },
    });
    topologyData.nodes.forEach((node) => edges.push({ from: `node-${node.name}`, to: nsId }));

    if (isExpanded) {
      pods.forEach((pod) => {
        const podId = `pod-${ns}-${pod.name}`;
        const restartWarning = pod.restarts > 0 ? ` ⚠️${pod.restarts}` : "";
        nodes.push({
          id: podId,
          label: `${pod.name}\n${pod.status}${restartWarning}`,
          level: 4,
          color: pod.status === "Running" ? "#a5d6a7" : "#ef9a9a",
          shape: "ellipse",
          font: { size: 12 },
        });
        edges.push({ from: nsId, to: podId });
      });
    }
  });

  nodesDataSet = new vis.DataSet(nodes);
  edgesDataSet = new vis.DataSet(edges);

  const container = document.getElementById("network");
  const options = {
    layout: {
      hierarchical: {
        direction: "UD",
        sortMethod: "directed",
        levelSeparation: 160,
        nodeSpacing: 180,
        treeSpacing: 220,
      },
    },
    physics: false,
    nodes: {
      font: { multi: true, align: "center" },
      margin: 10,
      widthConstraint: { maximum: 220 },
    },
    edges: {
      smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 0.4 },
      color: "#b0bec5",
    },
    interaction: { zoomView: true, dragView: true, hover: true },
  };

  network = new vis.Network(
    container,
    { nodes: nodesDataSet, edges: edgesDataSet },
    options
  );

  network.on("click", (params) => {
    if (params.nodes.length === 0) return;
    const clickedId = params.nodes[0];

    if (clickedId.startsWith("ns-")) {
      const nsName = clickedId.substring(3);
      if (expandedNamespaces.has(nsName)) {
        expandedNamespaces.delete(nsName);
      } else {
        expandedNamespaces.add(nsName);
      }
      buildGraph();
    } else if (clickedId === "control-plane") {
      expandedControlPlane = !expandedControlPlane;
      buildGraph();
    }
  });
}

loadTopology();
setInterval(loadTopology, 15000);
