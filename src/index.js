const { parseVariant, stringifyVariant, jsonifyVariant } = require('./variant');
const error = require('./error');
const constants = require('./constants');

module.exports = {
    error,
    constants,
    parseVariant,
    stringifyVariant,
    jsonifyVariant,
};
