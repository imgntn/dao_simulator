const width = 400;
const height = 300;
const svg = d3.select('#network').append('svg')
    .attr('width', width)
    .attr('height', height);
let nodes = [];
let links = [];
const simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.id).distance(50))
    .force('charge', d3.forceManyBody().strength(-150))
    .force('center', d3.forceCenter(width / 2, height / 2));

function drag(sim) {
  function dragstarted(event) {
    if (!event.active) sim.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }
  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }
  function dragended(event) {
    if (!event.active) sim.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
  return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
}

function update() {
  const link = svg.selectAll('line').data(links, d => d.id);
  link.join('line')
      .attr('stroke', d => d.type === 'delegation' ? 'blue' : '#999')
      .attr('stroke-dasharray', d => d.type === 'delegation' ? '4,2' : 'none');

  const node = svg.selectAll('circle').data(nodes, d => d.id);
  node.join('circle')
      .attr('r', 6)
      .attr('fill', d => d.type === 'proposal' ? 'lightgreen' : 'skyblue')
      .call(drag(simulation));

  node.append('title').text(d => d.id);

  simulation.nodes(nodes).on('tick', ticked);
  simulation.force('link').links(links);
  simulation.alpha(1).restart();
}

function ticked() {
  svg.selectAll('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

  svg.selectAll('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
}

function handleNetworkUpdate(data) {
  nodes = data.nodes;
  links = data.edges.map((e, i) => Object.assign({id: i}, e));
  update();
}

window.handleNetworkUpdate = handleNetworkUpdate;
