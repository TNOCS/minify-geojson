"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
exports.reportLog = function (logger, inputFile, outputFile, keys, count) {
    var inputFileSizeInBytes = fs.statSync(inputFile).size;
    var outputFileSizeInBytes = fs.statSync(outputFile).size;
    var percentage = 100 * (inputFileSizeInBytes - outputFileSizeInBytes) / inputFileSizeInBytes;
    logger("\n" + inputFile + (count ? ' with ' + count + ' features' : '') + " minified successfully to " + outputFile + ".\n");
    if (keys) {
        logger('Key mapping:');
        logger(JSON.stringify(keys, null, 2) + '\n');
    }
    logger("Original size :\t" + inputFileSizeInBytes.toLocaleString('en-US', { minimumFractionDigits: 0 }));
    logger("Minified size :\t" + outputFileSizeInBytes.toLocaleString('en-US', { minimumFractionDigits: 0 }));
    logger("Reduction :   \t" + percentage.toLocaleString('en-US', { minimumFractionDigits: 2 }) + "%");
};
exports.createPropertyFilter = function (prop, op, val) {
    switch (op) {
        case '=': return function (props) { return props.hasOwnProperty(prop) && props[prop] == val; };
        case '<': return function (props) { return props.hasOwnProperty(prop) && props[prop] < val; };
        case '>': return function (props) { return props.hasOwnProperty(prop) && props[prop] > val; };
        case '<=': return function (props) { return props.hasOwnProperty(prop) && props[prop] <= val; };
        case '>=': return function (props) { return props.hasOwnProperty(prop) && props[prop] >= val; };
        case '!=': return function (props) { return props.hasOwnProperty(prop) && props[prop] != val; };
        default: throw new Error("Operator " + op + " is not supported!");
    }
};
exports.convertQueryToPropertyFilters = function (filterQuery) {
    var re = /^([a-zA-Z_ 0-9]*) ?([!<>=]{1,2}) ?([a-zA-Z_ -0-9]*)$/;
    var queries = filterQuery.split(',').map(function (q) { return q.trim(); });
    var filters = [];
    queries.forEach(function (q) {
        var m = re.exec(q);
        if (!m || m.length !== 4) {
            var errMsg = 'Filters should be in the form PROPERTY OPERATOR VALUE, where property is a string, OPERATOR is <, =, >, !=, <= or >=, and VALUE is a string or number.';
            console.error(errMsg);
            throw new Error(errMsg);
        }
        filters.push(exports.createPropertyFilter(m[1].trim(), m[2].trim(), m[3].trim()));
    });
    return filters;
};
//# sourceMappingURL=utils.js.map