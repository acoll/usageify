var Promise = require('bluebird');
var glob = Promise.promisify(require('glob'));
var path = require('path');
var fs = require('fs');
require('loginator');
var logger = console.logger('usageify');

var clientScript = fs.readFileSync(path.join(__dirname, 'client.js'));

var files = new Set();
var runningCount = 0;

var pkg = require(path.join(process.cwd(), 'package.json'));
var parentDir = path.join(process.cwd(), '..');

var sourceFilesPromise = null;

module.exports = function (browserify, opts) {

	if(!sourceFilesPromise) {
		sourceFilesPromise = Promise.all(opts.patterns.map(p => glob(p)))
		.then(results => [].concat.apply([], results))
		.mapSeries(item => path.resolve(item))
		.filter(item => fs.lstatSync(item).isFile())
		.then(results => new Set(results));
	}

	runningCount++;

	browserify.pipeline.on('file', file => {

		if(/node_modules/.test(file)) return;

		files.add(file);

	});

	browserify.pipeline.on('end', () => {

		var entries = browserify._options.entries;
		var cache = browserify._options.cache;

		var sortedBySize = Object.keys(cache).map(k => {
			return {
				name: k, 
				size: cache[k].source.length, 
				shortname: k.replace(parentDir, '')
			}
		})
		.sort((a, b) => {
			if (a.size < b.size) return 1;
			else if (a.size > b.size) return -1;
			else  return 0;
		} )

		var depMap = function (entry) { 
			return { 
				name: entry, 
				size: cache[entry].source.length 
			};
		};

		var tree = {
			name: pkg.name,
			children: entries.map(depMap)
		};

		var queue = [].concat(tree.children);

		while(queue.length > 0) {
			var node = queue.pop();
			var item = cache[node.name];

			if(!node.children) node.children = [];

			var children = Object.keys(item.deps)
			.map(d => item.deps[d])
			.map(depMap)
			.forEach(child => {
				node.children.push(child);

				if(!cache[child.name].___visited) {
					queue.push(child);
					cache[child.name].___visited = true;
				}
			});

		}

		fs.writeFileSync('usageify-tree.html', `
<!DOCTYPE html>
<meta charset="utf-8">
<script src='http://cdn.filesizejs.com/filesize.min.js'></script>
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.0.0-beta1/jquery.min.js"></script>
<style>

	body {
		font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
	}

	path {
		stroke: #fff;
		fill-rule: evenodd;
	}

	#list-holder {
		float: left;
		width: 40%;
	}

	#graph-holder {
		float: right;
		width: 60%;
	}

</style>
<body>
<div id="list-holder">
	<form>
	  <label><input type="radio" name="mode" value="size"> Size</label>
	  <label><input type="radio" name="mode" value="count" checked> Count</label>
	</form>
	<h4 id="filename">Name Here</h4>
	<table>
		<thead>
			<tr>
				<th>Name</th>
				<th>Size</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
	</table>
</div>
<div id="graph-holder">
	<svg></svg>
</div>
<script>
	var sorted = ${JSON.stringify(sortedBySize, null, 2)};
	var root = ${JSON.stringify(tree, null, 2)};
	var node = root;
</script>

<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js"></script>
<script>
${clientScript}
</script>
			
			`);

		runningCount--;

		if(runningCount === 0) {
			logger.info('Usage Report ');

			// compare to source files
			sourceFilesPromise.then(sources => {

				logger.info(sources.size, 'source files');
				logger.info(files.size, 'required files');

				return Array.from(sources).filter(s => !files.has(s))
			})
			.then(unusedFiles => {
				if(unusedFiles.length)
					logger.info('The following files dont seem to be required by any browserify bundles.');
				unusedFiles.forEach(item => logger.info(`\t${item}`));
			});
		}

	});

};
