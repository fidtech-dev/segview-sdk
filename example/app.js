const SV = require('../lib/segview');
const config = require('./config');
const util = require('util')

const sv = new SV(config.apiKey, config.secret);
sv.sendPhoto(
  './testfile.jpg',
  'ab123cd',
  (res, err) => {
    if (err) throw err;
    console.log(util.inspect(res, {showHidden: false, depth: null}))
  },
);


