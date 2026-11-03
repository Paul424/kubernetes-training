let network;
let nodesDataSet;
let edgesDataSet;
let topologyData;
let hostInfoData = null;
let hostInfoError = false;
let expandedNamespaces = new Set();
let expandedControlPlane = false;
let expandedDocker = false;

// Namespace → categorie kleuren (gegroepeerd zoals in environments/dev/<categorie>/)
const NAMESPACE_COLORS = {
  "cert-manager":     { bg: "#94a3b8", border: "#64748b" }, // base/infra - slate
  "flux":             { bg: "#818cf8", border: "#4f46e5" }, // gitops - indigo
  "keycloak":         { bg: "#c084fc", border: "#9333ea" }, // security - paars
  "kube-system":      { bg: "#64748b", border: "#475569" }, // core k8s - donker slate
  "metallb-system":   { bg: "#fb923c", border: "#ea580c" }, // networking - oranje
  "traefik":          { bg: "#f97316", border: "#c2410c" }, // networking - oranje
  "monitoring":       { bg: "#34d399", border: "#059669" }, // observability - emerald
  "infra-visualizer": { bg: "#22d3ee", border: "#0891b2" }, // observability - cyaan
};
const DEFAULT_NS_COLOR = { bg: "#38bdf8", border: "#0284c7" };

function getNamespaceColor(ns) {
  return NAMESPACE_COLORS[ns] || DEFAULT_NS_COLOR;
}

function getPodHealthIcon(pod) {
  if (pod.status !== "Running") return "❌";
  if (pod.restarts > 0) return "⚠️";
  return "✅";
}
function getPodColor(pod) {
  if (pod.status !== "Running") {
    return { bg: "#f87171", border: "#dc2626" }; // rood - niet running
  }
  if (pod.restarts > 5) {
    return { bg: "#fbbf24", border: "#d97706" }; // oranje - veel restarts, let op
  }
  if (pod.restarts > 0) {
    return { bg: "#a3e635", border: "#65a30d" }; // lichtgroen - lichte restarts, prima
  }
  return { bg: "#4ade80", border: "#16a34a" }; // groen - helemaal gezond
}

async function loadHostInfo() {
  try {
    const res = await fetch("/api/host-info");
    if (!res.ok) {
      hostInfoError = true;
      hostInfoData = null;
      return;
    }
    hostInfoData = await res.json();
    hostInfoError = false;
  } catch (e) {
    hostInfoError = true;
    hostInfoData = null;
  }
}

async function loadTopology() {
  const [topologyRes] = await Promise.all([
    fetch("/api/topology"),
    loadHostInfo(),
  ]);
  topologyData = await topologyRes.json();
  buildGraph();
}

function buildGraph() {
  const nodes = [];
  const edges = [];

  // --- VM node: live CPU/geheugen stats via host-agent ---
  let vmLabel = "🖥️ Ubuntu VM\n(VMware)";
  let vmColor = { background: "#4a5568", border: "#2d3748" };

  if (hostInfoData && hostInfoData.vm) {
    const { cpu_percent, memory_percent, memory_used_gb, memory_total_gb } = hostInfoData.vm;
    vmLabel = `🖥️ Ubuntu VM\nCPU: ${cpu_percent.toFixed(1)}%  |  MEM: ${memory_percent.toFixed(1)}%\n(${memory_used_gb.toFixed(1)} / ${memory_total_gb.toFixed(1)} GB)`;
    if (cpu_percent > 85 || memory_percent > 90) {
      vmColor = { background: "#fbbf24", border: "#d97706" }; // waarschuwing: hoge belasting
    }
  } else if (hostInfoError) {
    vmLabel = "🖥️ Ubuntu VM\n⚠️ host-agent unreachable";
    vmColor = { background: "#f87171", border: "#dc2626" };
  }

  nodes.push({
    id: "vm",
    label: vmLabel,
    level: 0,
    color: vmColor,
    shape: "box",
    shapeProperties: { borderRadius: 8 },
    font: { size: 13, color: "#e6e6e6", multi: true, align: "center" },
    borderWidth: 1,
    shadow: { enabled: true, color: "rgba(0,0,0,0.3)", size: 8, x: 0, y: 2 },
  });

  // --- Docker node: klikbaar, toont containers bij uitklappen ---
  const containerCount =
    hostInfoData && hostInfoData.docker_containers ? hostInfoData.docker_containers.length : 0;

  let dockerLabel, dockerColor;
  if (hostInfoError) {
    dockerLabel = "🐳 Docker\n⚠️ unreachable";
    dockerColor = { background: "#f87171", border: "#dc2626" };
  } else {
    dockerLabel = `🐳 Docker\n(${containerCount} containers)\n${expandedDocker ? "▼" : "▶ klik om te openen"}`;
    dockerColor = { background: "#4a5568", border: "#2d3748" };
  }

  nodes.push({
    id: "docker",
    label: dockerLabel,
    level: 1,
    color: dockerColor,
    shape: "box",
    shapeProperties: { borderRadius: 8 },
    font: { size: 13, color: "#e6e6e6", multi: true, align: "center" },
    borderWidth: 1,
    shadow: { enabled: true, color: "rgba(0,0,0,0.3)", size: 8, x: 0, y: 2 },
  });
  edges.push({ from: "vm", to: "docker" });

  if (expandedDocker && hostInfoData && hostInfoData.docker_containers) {
    hostInfoData.docker_containers.forEach((c) => {
      const id = `container-${c.name}`;
      nodes.push({
        id,
        label: `📦 ${c.name}\n${c.status}\n${c.image}`,
        level: 2,
        color: { background: "#94a3b8", border: "#64748b" },
        shape: "box",
        shapeProperties: { borderRadius: 6 },
        font: { size: 10, color: "#0f1419" },
        widthConstraint: { minimum: 170, maximum: 200 },
        borderWidth: 1,
        shadow: { enabled: true, color: "rgba(0,0,0,0.2)", size: 4, x: 0, y: 1 },
      });
      edges.push({ from: "docker", to: id });
    });
  }

  // Nodes (k8s) — level opgeschoven van 2 naar 3
  topologyData.nodes.forEach((node) => {
    const nodeId = `node-${node.name}`;
    const bg = node.ready ? "#2dd4bf" : "#f87171";
    const border = node.ready ? "#14b8a6" : "#dc2626";
    nodes.push({
      id: nodeId,
      label: `🖥️ ${node.name}\n${node.ready ? "✅ Ready" : "❌ NotReady"}\nk8s ${node.kubelet_version}`,
      level: 3,
      color: { background: bg, border: border },
      shape: "box",
      shapeProperties: { borderRadius: 8 },
      font: { size: 15, color: "#0f1419" },
      borderWidth: 2,
      shadow: { enabled: true, color: "rgba(0,0,0,0.3)", size: 8, x: 0, y: 2 },
    });
    edges.push({ from: "docker", to: nodeId });
  });

  // Control plane (inklapbaar) — level opgeschoven van 3 naar 4
  const cpCount = topologyData.control_plane_pods.length;
  nodes.push({
    id: "control-plane",
    label: `⚙️ Control Plane\n(${cpCount} pods)\n${expandedControlPlane ? "▼ klik om in te klappen" : "▶ klik om uit te klappen"}`,
    level: 4,
    color: { background: "#fbbf24", border: "#d97706" },
    shape: "box",
    shapeProperties: { borderRadius: 8 },
    font: { size: 13, color: "#0f1419" },
    borderWidth: 2,
    shadow: { enabled: true, color: "rgba(0,0,0,0.3)", size: 6, x: 0, y: 2 },
  });
  topologyData.nodes.forEach((node) => edges.push({ from: `node-${node.name}`, to: "control-plane" }));

  if (expandedControlPlane) {
    topologyData.control_plane_pods.forEach((pod) => {
      const id = `cp-${pod.name}`;
      const { bg, border } = getPodColor(pod);
      const icon = getPodHealthIcon(pod);
      const restartSuffix = pod.restarts > 0 ? ` (${pod.restarts}x herstart)` : "";
      nodes.push({
        id,
        label: `${icon} ${pod.name}\n${pod.status}${restartSuffix}`,
        level: 5,
        color: { background: bg, border: border },
        shape: "box",
        shapeProperties: { borderRadius: 6 },
        font: { size: 11, color: "#0f1419" },
        widthConstraint: { minimum: 170, maximum: 170 },
        borderWidth: 1,
        shadow: { enabled: true, color: "rgba(0,0,0,0.2)", size: 4, x: 0, y: 1 },
      });
      edges.push({ from: "control-plane", to: id });
    });
  }

  // Namespaces (inklapbaar) — level opgeschoven van 3 naar 4
  Object.entries(topologyData.namespaces).forEach(([ns, pods]) => {
    const nsId = `ns-${ns}`;
    const isExpanded = expandedNamespaces.has(ns);
    const nsColor = getNamespaceColor(ns);
    nodes.push({
      id: nsId,
      label: `📦 ${ns}\n(${pods.length} pods)\n${isExpanded ? "▼" : "▶ klik om te openen"}`,
      level: 4,
      color: { background: nsColor.bg, border: nsColor.border },
      shape: "box",
      shapeProperties: { borderRadius: 8 },
      font: { size: 13, color: "#0f1419" },
      borderWidth: 2,
      shadow: { enabled: true, color: "rgba(0,0,0,0.3)", size: 6, x: 0, y: 2 },
    });
    topologyData.nodes.forEach((node) => edges.push({ from: `node-${node.name}`, to: nsId }));

    if (isExpanded) {
      pods.forEach((pod) => {
        const podId = `pod-${ns}-${pod.name}`;
        const { bg, border } = getPodColor(pod);
        const icon = getPodHealthIcon(pod);
        const restartSuffix = pod.restarts > 0 ? ` (${pod.restarts}x herstart)` : "";
        nodes.push({
          id: podId,
          label: `${icon} ${pod.name}\n${pod.status}${restartSuffix}`,
          level: 5,
          color: { background: bg, border: border },
          shape: "box",
          shapeProperties: { borderRadius: 6 },
          font: { size: 11, color: "#0f1419" },
          widthConstraint: { minimum: 170, maximum: 170 },
          borderWidth: 1,
          shadow: { enabled: true, color: "rgba(0,0,0,0.2)", size: 4, x: 0, y: 1 },
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
        nodeSpacing: 170,
        treeSpacing: 210,
      },
    },
    physics: false,
    nodes: {
      font: { multi: true, align: "center" },
      margin: 10,
    },
    edges: {
      smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 0.4 },
      color: { color: "#2a3240", highlight: "#38bdf8" },
      width: 1.5,
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
    } else if (clickedId === "docker") {
      expandedDocker = !expandedDocker;
      buildGraph();
    }
  });
}

function updateTimestamp() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  document.getElementById("last-updated").textContent = `Laatste update: ${timeStr}`;
}

async function refreshNow() {
  await loadTopology();
  updateTimestamp();
}

function setupToolbar() {
  document.getElementById("zoom-in").addEventListener("click", () => {
    const scale = network.getScale();
    network.moveTo({ scale: scale * 1.3 });
  });

  document.getElementById("zoom-out").addEventListener("click", () => {
    const scale = network.getScale();
    network.moveTo({ scale: scale * 0.7 });
  });

  document.getElementById("fit-screen").addEventListener("click", () => {
    network.fit({ animation: true });
  });

  document.getElementById("refresh-btn").addEventListener("click", () => {
    refreshNow();
  });

  const searchBox = document.getElementById("search-box");
  searchBox.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const query = searchBox.value.trim().toLowerCase();
    if (!query) return;

    // Auto-expand alle namespaces + control plane + docker zodat de node vindbaar is
    Object.keys(topologyData.namespaces).forEach((ns) => expandedNamespaces.add(ns));
    expandedControlPlane = true;
    expandedDocker = true;
    buildGraph();

    const allNodes = nodesDataSet.get();
    const match = allNodes.find((n) =>
      n.id.toLowerCase().includes(query) || (n.label && n.label.toLowerCase().includes(query))
    );

    if (match) {
      network.selectNodes([match.id]);
      network.focus(match.id, { scale: 1.2, animation: true });
    } else {
      alert(`Geen resultaat gevonden voor "${query}"`);
    }
  });
}

loadTopology();
updateTimestamp();
setInterval(refreshNow, 15000);

// Toolbar pas koppelen zodra de eerste graph is opgebouwd
const toolbarInterval = setInterval(() => {
  if (network) {
    setupToolbar();
    clearInterval(toolbarInterval);
  }
}, 100);
