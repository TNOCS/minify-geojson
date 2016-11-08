"use strict";
var fs = require('fs');
var path = require('path');
var winston = require('winston');
var MinifyGeoJSON = (function () {
    function MinifyGeoJSON(options) {
        var _this = this;
        this.options = options;
        this.keys = {};
        this.reversedKeys = {};
        this.lastKey = 1;
        this.logger = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)({ level: options.verbose ? 'info' : 'warning' })
            ]
        });
        options.src.forEach(function (s) {
            var file = path.resolve(s);
            if (fs.existsSync(file)) {
                _this.loadFile(file, options, function (geojson) {
                    if (!geojson)
                        throw new Error('Could not read input file!');
                    var ext = options.topo ? ".min.topojson" : ".min.geojson";
                    var outputFile = file.replace(/\.[^/.]+$/, ext);
                    if (options.filter)
                        geojson = _this.filter(geojson, options.filter);
                    if (options.reproject) {
                        var crsName = options.reproject.toUpperCase();
                        if (!crsName.match(/^EPSG:/))
                            crsName = "EPSG:" + crsName;
                        _this.logger.info("REPROJECTING from " + crsName + " to WGS84");
                        _this.getCoordinateReferenceSystem(crsName, function (crss) {
                            var reproject = require('reproject');
                            geojson = reproject.toWgs84(geojson, crss, crss);
                            _this.processGeoJSON(geojson, file, outputFile, options, function () { });
                        });
                    }
                    else {
                        _this.processGeoJSON(geojson, file, outputFile, options, function () { });
                    }
                });
            }
        });
    }
    MinifyGeoJSON.prototype.filter = function (geojson, filterQuery) {
        var re = /^([a-zA-Z_ 0-9]*)([<>=]{1,2})([a-zA-Z_ 0-9]*)$/;
        var filteredFeatures = [];
        var filter = function (prop) { return function (op) { return function (val) { return function (props) {
            if (!props.hasOwnProperty(prop))
                return false;
            switch (op.trim()) {
                case '=': return props[prop] === val;
                case '<': return props[prop] < val;
                case '>': return props[prop] > val;
                case '<=': return props[prop] <= val;
                case '>=': return props[prop] >= val;
                default: throw new Error("Operator " + op + " is not supported!");
            }
        }; }; }; };
        var queries = filterQuery.split(',').map(function (q) { return q.trim(); });
        var filters = [];
        queries.forEach(function (q) {
            var m = re.exec(q);
            if (!m || m.length !== 4) {
                throw new Error('Filters should be in the form PROPERTY OPERATOR VALUE, where property is a string, OPERATOR is <, =, >, <= or >=, and VALUE is a string or number.');
            }
            filters.push(filter(m[1].trim())(m[2].trim())(m[3].trim()));
        });
        filteredFeatures = geojson.features.filter(function (feature) {
            var pass = true;
            filters.some(function (f) {
                if (f(feature.properties))
                    return false;
                pass = false;
                return true;
            });
            return pass;
        });
        geojson.features = filteredFeatures;
        return geojson;
    };
    MinifyGeoJSON.prototype.loadFile = function (inputFile, options, cb) {
        if (!(options.keys || options.coordinates || options.whitelist || options.blacklist))
            return cb();
        var geojson;
        var ext = path.extname(inputFile);
        if (ext.match(/json$/i)) {
            fs.readFile(inputFile, 'utf8', function (err, data) {
                if (err)
                    throw err;
                geojson = JSON.parse(data);
                geojson.type = "FeatureCollection";
                cb(geojson);
            });
        }
        else if (ext.match(/shp$/i)) {
            var shapefile = require('shapefile');
            shapefile.read(inputFile, function (err, geojson) {
                if (err)
                    throw err;
                cb(geojson);
            });
        }
    };
    MinifyGeoJSON.prototype.processGeoJSON = function (geojson, inputFile, outputFile, options, done) {
        var _this = this;
        var minifyKeys = options.keys;
        var minifyCoordinates = options.coordinates;
        var whitelist;
        var blacklist;
        if (options.whitelist)
            whitelist = options.whitelist.split(',').map(function (e) { return e.trim(); });
        if (options.blacklist)
            blacklist = options.blacklist.split(',').map(function (e) { return e.trim(); });
        if (minifyKeys || blacklist || whitelist) {
            geojson.features.forEach(function (f) {
                if (f.properties) {
                    if (blacklist || whitelist)
                        f.properties = _this.prune(f.properties, blacklist, whitelist);
                    if (minifyKeys)
                        f.properties = _this.minifyPropertyKeys(f.properties);
                }
            });
        }
        if (minifyKeys && options.includeKeyMap) {
            geojson['map'] = this.reversedKeys;
        }
        var json = geojson;
        if (options.topo) {
            this.logger.info('CONVERTING to TopoJSON');
            var topojson = require("topojson");
            var topology = topojson.topology({ collection: geojson }, { verbose: options.verbose, 'property-transform': function (feature) { return feature.properties; } });
            topology = topojson.prune(topology, { verbose: options.verbose });
            topology = topojson.simplify(topology, { verbose: options.verbose, 'coordinate-system': 'spherical' });
            json = topology;
        }
        var minified;
        if (!options.topo && typeof minifyCoordinates === 'number' && minifyCoordinates > 0) {
            minified = JSON.stringify(json, function (key, val) {
                if (isNaN(+key))
                    return val;
                return val.toFixed ? Number(val.toFixed(minifyCoordinates)) : val;
            });
        }
        else {
            minified = JSON.stringify(json);
        }
        fs.writeFile(outputFile, minified, function (err) {
            if (err)
                throw err;
            if (options.verbose) {
                var inputStats = fs.statSync(inputFile);
                var inputFileSizeInBytes = inputStats["size"];
                var outputStats = fs.statSync(outputFile);
                var outputFileSizeInBytes = outputStats["size"];
                var percentage = 100 * (inputFileSizeInBytes - outputFileSizeInBytes) / inputFileSizeInBytes;
                _this.logger.info(inputFile + " minified successfully to " + outputFile + "!");
                if (minifyKeys) {
                    _this.logger.info('Key mapping:');
                    _this.logger.info(JSON.stringify(_this.keys, null, 2));
                }
                _this.logger.info("Original size: " + inputFileSizeInBytes.toLocaleString('en-US', { minimumFractionDigits: 0 }));
                _this.logger.info("New size:      " + outputFileSizeInBytes.toLocaleString('en-US', { minimumFractionDigits: 0 }));
                _this.logger.info("Reduction:     " + percentage.toLocaleString('en-US', { minimumFractionDigits: 2 }) + "%");
            }
            done();
        });
    };
    MinifyGeoJSON.prototype.getCoordinateReferenceSystem = function (crsName, cb) {
        var http = require('http');
        var proj4 = require('proj4');
        var crss = require('./crs-defs');
        for (var k in crss) {
            crss[k] = proj4(crss[k]);
        }
        if (crss[crsName])
            return cb(crss[crsName]);
        var crsPath = crsName.toLowerCase().replace(':', '/'), url = "http://www.spatialreference.org/ref/" + crsPath + "/proj4/", crsDef = '';
        http.get(url, function (res) {
            if (res.statusCode != 200) {
                throw new Error("spatialreference.org responded with HTTP " + res.statusCode +
                    " when looking up \"" + crsName + "\".");
            }
            res.on('data', function (chunk) {
                crsDef += chunk;
            }).on('end', function () {
                crss[crsName] = proj4(crsDef);
                cb(crss[crsName]);
            });
        });
    };
    MinifyGeoJSON.prototype.minifyPropertyKeys = function (props) {
        var newProps = {};
        for (var key in props) {
            var replace = void 0;
            if (this.keys.hasOwnProperty(key)) {
                replace = this.keys[key];
            }
            else {
                replace = this.smartKey(key);
                if (!replace) {
                    do {
                        replace = this.convertToNumberingScheme(this.lastKey++);
                    } while (this.reversedKeys.hasOwnProperty(replace));
                }
                this.keys[key] = replace;
                this.reversedKeys[replace] = key;
            }
            newProps[replace] = props[key];
        }
        return newProps;
    };
    MinifyGeoJSON.prototype.smartKey = function (key) {
        var id = 'id';
        key = key.toLowerCase();
        if (key === id) {
            if (!this.reversedKeys.hasOwnProperty(id))
                return id;
        }
        var replace = key.trim()[0];
        return this.reversedKeys.hasOwnProperty(replace) ? undefined : replace;
    };
    MinifyGeoJSON.prototype.prune = function (props, blacklist, whitelist) {
        if (!blacklist && !whitelist)
            return props;
        var newProps = {};
        for (var key in props) {
            if (blacklist && blacklist.indexOf(key) >= 0)
                continue;
            if (whitelist && whitelist.indexOf(key) < 0)
                continue;
            newProps[key] = props[key];
        }
        return newProps;
    };
    MinifyGeoJSON.prototype.convertToNumberingScheme = function (counter) {
        var baseChar = ("a").charCodeAt(0);
        var letters = "";
        do {
            counter -= 1;
            letters = String.fromCharCode(baseChar + (counter % 26)) + letters;
            counter = (counter / 26) >> 0;
        } while (counter > 0);
        return letters;
    };
    return MinifyGeoJSON;
}());
exports.MinifyGeoJSON = MinifyGeoJSON;
//# sourceMappingURL=minify-geojson.js.map