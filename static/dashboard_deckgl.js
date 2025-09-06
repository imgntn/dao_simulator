(function () {
(function () {
  const containerId = 'network';
  let deckInstance = null;
  let nodeData = [];
  let edgeData = [];

  function initDeck() {
    if (typeof deck === 'undefined') return;
    deckInstance = new deck.DeckGL({
      container: containerId,
      initialViewState: {target: [0, 0, 0], zoom: 0},
      controller: true,
      views: [new deck.OrthographicView({id: 'ortho'})],
      layers: [],
    });
    const container = document.getElementById(containerId);
    if (container && !document.getElementById('deckgl-tooltip')) {
      const tip = document.createElement('div');
      tip.id = 'deckgl-tooltip';
      tip.style.position = 'absolute';
      tip.style.pointerEvents = 'none';
      tip.style.background = 'rgba(0,0,0,0.7)';
      tip.style.color = 'white';
      tip.style.padding = '4px 6px';
      tip.style.borderRadius = '4px';
      tip.style.fontSize = '12px';
      tip.style.display = 'none';
      container.appendChild(tip);
    }
  }

  function layoutGrid(nodes) {
    const n = nodes.length;
    const cols = Math.ceil(Math.sqrt(n));
    const spacing = 10;
    return nodes.map((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return Object.assign({}, d, {position: [col * spacing, row * spacing, 0]});
    });
  }

  function edgeColor(type) {
    switch (type) {
      case 'delegation':
        return [0, 0, 255]; // blue
      case 'representative':
        return [128, 0, 128]; // purple
      case 'created':
        return [0, 200, 0]; // green
      default:
        return [128, 128, 128]; // gray
    }
  }

  function buildEdgeData(edges, nodes) {
    const map = {};
    nodes.forEach((n) => {
      map[n.id] = n;
    });
    return edges
      .map((e) => {
        const s = map[e.source];
        const t = map[e.target];
        if (!s || !t) return null;
        return {
          source: s.position,
          target: t.position,
          color: edgeColor(e.type),
          width: Math.max(1, (e.weight || 1) / 10),
        };
      })
      .filter(Boolean);
  }

  function updateLayers() {
    if (!deckInstance) return;
    const nodesLayer = new deck.ScatterplotLayer({
      id: 'nodes',
      data: nodeData,
      pickable: true,
      radiusScale: 1,
      radiusMinPixels: 2,
      getPosition: (d) => d.position,
      getFillColor: (d) => {
        if (d.type === 'cluster') return [255, 165, 0]; // orange for clusters
        return d.type === 'proposal' ? [144, 238, 144] : [135, 206, 235];
      },
      getRadius: (d) => {
        if (d.type === 'cluster') return Math.max(4, Math.sqrt(d.size || 1));
        return 4;
      },
      onHover: (info) => {
        const tip = document.getElementById('deckgl-tooltip');
        if (!tip) return;
        if (info && info.object) {
          tip.style.left = (info.x || 0) + 8 + 'px';
          tip.style.top = (info.y || 0) + 8 + 'px';
          tip.innerHTML = info.object.id || info.object.label || 'node';
          tip.style.display = 'block';
        } else {
          tip.style.display = 'none';
        }
      },
    });

    const lines = edgeData;
    const edgesLayer = new deck.LineLayer({
      id: 'edges',
      data: lines,
      getSourcePosition: (d) => d.source,
      getTargetPosition: (d) => d.target,
      getColor: (d) => d.color,
      getWidth: (d) => d.width,
      rounded: true,
    });

    deckInstance.setProps({layers: [edgesLayer, nodesLayer]});
  }

  function handleNetworkUpdate(data) {
    const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
    const rawEdges = Array.isArray(data.edges) ? data.edges : [];
    const visibleNodes = Array.isArray(data.visible_nodes) ? data.visible_nodes : null;
    const visibleEdges = Array.isArray(data.visible_edges) ? data.visible_edges : null;

    // Prefer cluster-level LOD if provided for large graphs
    const useVisible = visibleNodes && visibleEdges && ((rawNodes && rawNodes.length > 1000) || data.clusters);
    const nodesIn = useVisible ? visibleNodes : rawNodes;
    const edgesIn = useVisible ? visibleEdges : rawEdges;

    // If the server provided positions use them, otherwise fall back to a grid layout.
    if (nodesIn.length && nodesIn[0].position) {
      nodeData = nodesIn.map((n) => {
        const pos = Array.isArray(n.position) ? n.position.slice(0, 3) : [0, 0, 0];
        return Object.assign({}, n, {position: pos});
      });
    } else {
      nodeData = layoutGrid(nodesIn);
    }
    edgeData = buildEdgeData(edgesIn, nodeData);
    if (!deckInstance) initDeck();
    updateLayers();
  }

  // Expose the handler for the websocket receiver in index.html
  window.handleNetworkUpdate = handleNetworkUpdate;

  // Initialize early if deck is already available
  if (typeof deck !== 'undefined') initDeck();
})();
