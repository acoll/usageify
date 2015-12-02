# usageify
Browserify plugin to find unused source files.

## Installation
```
npm install --save acoll/usageify
```

## Usage of usageify
Via API
```js
var usageify = require('usageify');

bundle.plugin(usageify, { patterns: ['src/**/*.js'] });
```

## Configuration
**usageify** uses [isaacs/node-glob](https://github.com/isaacs/node-glob) to get the list of source files based on your configured patterns.

After your browserify bundle completes, the plugin logs the files that don't appear to be used. 
