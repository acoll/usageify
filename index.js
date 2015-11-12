var Promise = require('bluebird');
var glob = Promise.promisify(require('glob'));
var path = require('path');

var files = new Set();
var runningCount = 0;

var sourceFilesPromise = null;

module.exports = function (browserify, opts) {

	if(!sourceFilesPromise) {
		sourceFilesPromise = Promise.all(opts.patterns.map(p => glob(p)))
		.then(results => [].concat.apply([], results))
		.mapSeries(item => path.resolve(item))
		.then(results => new Set(results));
	}

	runningCount++;

	browserify.pipeline.on('file', file => {

		if(/node_modules/.test(file)) return;

		files.add(file);

	});

	browserify.pipeline.on('end', () => {

		runningCount--;

		if(runningCount === 0) {
			console.log('[usageify] Usage Report ');

			// compare to source files
			sourceFilesPromise.then(sources => {

				console.log('[usageify]', sources.size, 'source files');
				console.log('[usageify]', files.size, 'required files');
				console.log('[usageify] The following files dont seem to be required by any browserify bundles.');

				return Array.from(sources).filter(s => !files.has(s))
			})
			.each(item => console.log(`\t${item}`));
		}

	});

};
