var Promise = require('bluebird');
var glob = Promise.promisify(require('glob'));
var path = require('path');
var fs = require('fs');
var logger = require('loginator')('usageify');

var files = new Set();
var runningCount = 0;

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
