"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var http = require("http");
var proj4 = require("proj4");
var shapefile = require("shapefile");
var reproject = require("reproject");
var utils_1 = require("./utils");
var MinifyGeoJSON = (function () {
    function MinifyGeoJSON(options) {
        var _this = this;
        this.options = options;
        this.logger = console.log;
        this.reversedKeys = {};
        this.lastKey = 1;
        options.src.forEach(function (s) {
            var file = path.resolve(s);
            if (!fs.existsSync(file)) {
                console.error(file + " does not exist! Are you perhaps missing a \"?\n");
                return;
            }
            _this.loadFile(file, options, function (geojson) {
                if (!geojson)
                    throw new Error('Could not read input file! Please see the options.');
                var ext = options.topo ? '.min.topojson' : '.min.geojson';
                var outputFile = file.replace(/\.[^/.]+$/, ext);
                if (options.filter) {
                    geojson = _this.filter(geojson, options.filter);
                }
                if (options.reproject) {
                    var crsName = options.reproject.toUpperCase();
                    if (!crsName.match(/^EPSG:/))
                        crsName = "EPSG:" + crsName;
                    _this.logger("REPROJECTING from " + crsName + " to WGS84");
                    _this.getCoordinateReferenceSystem(crsName, function (crss) {
                        geojson = reproject.toWgs84(geojson, crss, crss);
                        _this.processGeoJSON(geojson, file, outputFile, options, function () { });
                    });
                }
                else {
                    _this.processGeoJSON(geojson, file, outputFile, options, function () { });
                }
            });
        });
    }
    MinifyGeoJSON.prototype.filter = function (geojson, filterQuery) {
        var filters = utils_1.convertQueryToPropertyFilters(filterQuery);
        geojson.features = geojson.features.filter(function (feature) {
            var pass = true;
            filters.some(function (f) {
                if (f(feature.properties)) {
                    return false;
                }
                pass = false;
                return true;
            });
            return pass;
        });
        return geojson;
    };
    MinifyGeoJSON.prototype.loadFile = function (inputFile, options, cb) {
        var geojson;
        var ext = path.extname(inputFile);
        if (ext.match(/json$/i)) {
            fs.readFile(inputFile, 'utf8', function (err, data) {
                if (err)
                    throw err;
                geojson = JSON.parse(data);
                geojson.type = 'FeatureCollection';
                cb(geojson);
            });
        }
        else if (ext.match(/shp$/i)) {
            shapefile.read(inputFile).then(function (readGeoJSON) { return cb(readGeoJSON); }).catch(function (err) { return console.error(err); });
        }
    };
    MinifyGeoJSON.prototype.processGeoJSON = function (geojson, inputFile, outputFile, options, done) {
        var _this = this;
        var minifyKeys = options.keys;
        var minifyCoordinates = options.coordinates;
        var whitelist = options.whitelist ? options.whitelist.split(',').map(function (e) { return e.trim(); }) : undefined;
        var blacklist = options.blacklist ? options.blacklist.split(',').map(function (e) { return e.trim(); }) : undefined;
        if (minifyKeys || blacklist || whitelist) {
            this.keys = minifyKeys ? {} : undefined;
            geojson.features.forEach(function (f) {
                if (f.properties) {
                    if (blacklist || whitelist)
                        f.properties = _this.prune(f.properties, blacklist, whitelist);
                    if (minifyKeys) {
                        f.properties = _this.minifyPropertyKeys(f.properties);
                    }
                }
            });
        }
        if (minifyKeys && options.includeKeyMap) {
            geojson['map'] = this.reversedKeys;
        }
        var json = geojson;
        if (options.topo) {
            this.logger('CONVERTING to TopoJSON');
            var topojson_1 = require('topojson');
            var topology = topojson_1.topology({ collection: geojson }, { verbose: options.verbose, 'property-transform': function (feature) { return feature.properties; } });
            topology = topojson_1.prune(topology, { verbose: options.verbose });
            topology = topojson_1.simplify(topology, { verbose: options.verbose, 'coordinate-system': 'spherical' });
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
                utils_1.reportLog(_this.logger, inputFile, outputFile, _this.keys);
            }
            done();
        });
    };
    MinifyGeoJSON.prototype.getCoordinateReferenceSystem = function (crsName, cb) {
        var crss = require('./crs-defs');
        for (var k in crss) {
            crss[k] = proj4(crss[k]);
        }
        if (crss[crsName]) {
            return cb(crss[crsName]);
        }
        var crsPath = crsName.toLowerCase().replace(':', '/');
        var url = 'http://www.spatialreference.org/ref/' + crsPath + '/proj4/';
        var crsDef = '';
        http.get(url, function (res) {
            if (res.statusCode !== 200) {
                throw new Error("Spatialreference.org responded with HTTP " + res.statusCode + " while looking up \"" + crsName + "\".");
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
        var baseChar = ('a').charCodeAt(0);
        var letters = '';
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