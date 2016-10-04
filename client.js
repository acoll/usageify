// table stuff

var total = sorted.reduce((prev, curr) => prev + curr.size, 0)

var totalRow = $(`
<tr>
  <td>Total</td>
  <td>${filesize(total)}</td>
</tr>
    `);
 $('tbody').append(totalRow);

sorted.forEach(item => {
  var row = $(`
<tr>
  <td>${item.shortname}</td>
  <td nowrap>${filesize(item.size)}</td>
</tr>
    `);

  var selector = 'path#' + item.name.replace(/[\/\.]/g, '_');

  row.on('click', function () {
    $(selector)[0].dispatchEvent(new MouseEvent('click'))
  });
  $('tbody').append(row);
})


var width = 960,
    height = 700,
    radius = Math.min(width, height) / 2;

var x = d3.scale.linear()
    .range([0, 2 * Math.PI]);

var y = d3.scale.sqrt()
    .range([0, radius]);

var color = d3.scale.category20c();

var svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height)
  .append("g")
    .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

var partition = d3.layout.partition()
    .sort(null)
    .value(function(d) { return 1; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, y(d.y)); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

// Keep track of the node that is currently being displayed as the root.
document.querySelector('#filename').innerHTML = root.name
var path = svg.datum(root).selectAll("path")
  .data(partition.nodes)
.enter().append("path")
  .attr("d", arc)
  .attr('arcthingy', true)
  .attr('id', d => d.name.replace(/[\/\.]/g, '_'))
  .style("fill", function(d) { return color((d.children ? d : d.parent).name); })
  .on("click", click)
  .on('mouseover', d => document.querySelector('#filename').innerHTML = d.name)
  .each(stash);

  function click (d) {
    node = d;
    path.transition().duration(1000).attrTween('d', arcTweenZoom(d));
    console.log(d);
  }

d3.selectAll("input").on("change", function change() {
    var value = this.value === "count"
        ? function() { return 1; }
        : function(d) { return d.size; };

    path
    .data(partition.value(value).nodes)
    .transition()
    .duration(1000)
    .attrTween("d", arcTweenData);
});


d3.select(self.frameElement).style("height", height + "px");

// Setup for switching data: stash the old values for transition.
function stash(d) {
  d.x0 = d.x;
  d.dx0 = d.dx;
}

// When switching data: interpolate the arcs in data space.
function arcTweenData(a, i) {
  var oi = d3.interpolate({x: a.x0, dx: a.dx0}, a);
  function tween(t) {
    var b = oi(t);
    a.x0 = b.x;
    a.dx0 = b.dx;
    return arc(b);
  }
  if (i == 0) {
   // If we are on the first arc, adjust the x domain to match the root node
   // at the current zoom level. (We only need to do this once.)
    var xd = d3.interpolate(x.domain(), [node.x, node.x + node.dx]);
    return function(t) {
      x.domain(xd(t));
      return tween(t);
    };
  } else {
    return tween;
  }
}

// When zooming: interpolate the scales.
function arcTweenZoom(d) {
  var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
      yd = d3.interpolate(y.domain(), [d.y, 1]),
      yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
  return function(d, i) {
    return i
        ? function(t) { return arc(d); }
        : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
  };
}
