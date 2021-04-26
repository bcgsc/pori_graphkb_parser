const position = require('./position');
const variant = require('./variant');
const error = require('./error');
const constants = require('./constants');

module.exports = {
    variant, position, error, constants, parse: variant.parse,
};
