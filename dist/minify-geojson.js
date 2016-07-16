"use strict";
var fs = require('fs');
var path = require('path');
var winston = require('winston');
var commandLineArgs = require('command-line-args');
var getUsage = require('command-line-usage');
var optionDefinitions = [
    { name: 'keys', alias: 'k', type: Boolean, typeLabel: '[underline]{Boolean}', description: 'Minify property keys, e.g. id remains id, telephone becomes t, address a etc.' },
    { name: 'includeKeyMap', alias: 'i', type: Boolean, typeLabel: '[underline]{Boolean}', description: 'Add the key map to the GeoJSON file. Requires the -k flag too.' },
    { name: 'topo', alias: 't', type: Boolean, typeLabel: '[underline]{Boolean}', description: 'Output format is TopoJSON instead of GeoJSON' },
    { name: 'from', alias: 'f', type: String, typeLabel: '[underline]{String}', description: 'Reproject to WGS84 by supplying the input EPSG coordinate system, e.g. -f EPSG:4326' },
    { name: 'blacklist', alias: 'b', type: String, typeLabel: '[underline]{String}', description: 'Comma separated list of properties that should be removed (others will be kept). Note that keys will not be minified unless the -k flag is used too.' },
    { name: 'whitelist', alias: 'w', type: String, typeLabel: '[underline]{String}', description: 'Comma separated list of properties that should be kept (others will be removed). Note that keys will not be minified unless the -k flag is used too.' },
    { name: 'coordinates', alias: 'c', type: Number, defaultOption: false, typeLabel: '[underline]{Positive number}', description: 'Only keep the first [italic]{n} digits of each coordinate.' },
    { name: 'src', alias: 's', type: String, multiple: true, defaultOption: true, typeLabel: '[underline]{File names}', description: 'Source files to process: you do not need to supply the -s flag.' },
    { name: 'verbose', alias: 'v', type: Boolean, typeLabel: '[underline]{Boolean}', description: 'Output is verbose.' }
];
var sections = [{
        header: 'Minify GeoJSON',
        content: 'Minify (compress) each input GeoJSON or ESRI shape file by replacing the attribute keys with a shorter representation (typically, its first letter). You can also reduce the number of decimals for coordinates, and whitelist and blacklist certain properties..'
    }, {
        header: 'Options',
        optionList: optionDefinitions
    }, {
        header: 'Examples',
        content: [{
                desc: '1. Shrink property keys and output to original.min.geojson',
                example: '$ minify-geojson -k original.geojson'
            }, {
                desc: '2. A verbose version',
                example: '$ minify-geojson -kv original.geojson'
            }, {
                desc: '3. Prune the blacklisted properties',
                example: '$ minify-geojson -b "property1, property2" original.geojson'
            }, {
                desc: '4. Keep the whitelisted properties',
                example: '$ minify-geojson -w "property1, property2" original.geojson'
            }, {
                desc: '5. Removes superfluous decimals (keep first 5)',
                example: '$ minify-geojson -c 5 original.geojson'
            }, {
                desc: '6. Add the key mapping to the output',
                example: '$ minify-geojson -ki original.geojson'
            }, {
                desc: '7. Convert output to topojson (-i and -c are not used)',
                example: '$ minify-geojson -kt original.geojson'
            }, {
                desc: '8. Reproject shape file in RD (EPSG:28992) to TopoJSON',
                example: '$ minify-geojson -ktv -f 28992 original.shp'
            }, {
                desc: '9. Full example',
                example: '$ minify-geojson -ktiv -w "property1, property2" -c 5 original.geojson'
            }]
    }
];
var options = commandLineArgs(optionDefinitions);
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ level: options.verbose ? 'info' : 'warning' })
    ]
});
var keys = {};
var reversedKeys = {};
var lastKey = 1;
if (!options.src) {
    var usage = getUsage(sections);
    console.log(usage);
}
else {
    options.src.forEach(function (s) {
        var file = path.isAbsolute(s) ? s : path.join(process.cwd(), s);
        if (fs.existsSync(file)) {
            loadFile(file, options, function (geojson) {
                if (!geojson)
                    throw new Error('Could not read input file!');
                var ext = options.topo ? ".min.topojson" : ".min.geojson";
                var outputFile = file.replace(/\.[^/.]+$/, ext);
                if (options.from) {
                    logger.info('REPROJECTING to WGS84');
                    var crsName = options.from.toUpperCase();
                    if (!crsName.match(/^EPSG:/))
                        crsName = "EPSG:" + crsName;
                    getCoordinateReferenceSystem(crsName, function (crss) {
                        var reproject = require('reproject');
                        geojson = reproject.toWgs84(geojson, crss, crss);
                        processGeoJSON(geojson, file, outputFile, options, function () { });
                    });
                }
                else {
                    processGeoJSON(geojson, file, outputFile, options, function () { });
                }
            });
        }
    });
}
function loadFile(inputFile, options, cb) {
    if (!(options.keys || options.coordinates || options.whitelist || options.blacklist))
        return cb();
    var geojson;
    if (inputFile.match(/json$/i)) {
        fs.readFile(inputFile, 'utf8', function (err, data) {
            if (err)
                throw err;
            geojson = JSON.parse(data);
            geojson.type = "FeatureCollection";
            cb(geojson);
        });
    }
    else if (inputFile.match(/shp$/i)) {
        var shapefile = require('shapefile');
        shapefile.read(inputFile, function (err, geojson) {
            if (err)
                throw err;
            cb(geojson);
        });
    }
}
function processGeoJSON(geojson, inputFile, outputFile, options, done) {
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
                    f.properties = prune(f.properties, blacklist, whitelist);
                if (minifyKeys)
                    f.properties = minifyPropertyKeys(f.properties);
            }
        });
    }
    if (minifyKeys && options.includeKeyMap) {
        geojson['map'] = reversedKeys;
    }
    var json = geojson;
    if (options.topo) {
        logger.info('CONVERTING to TopoJSON');
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
            logger.info(inputFile + " minified successfully to " + outputFile + "!");
            if (minifyKeys) {
                logger.info('Key mapping:');
                logger.info(JSON.stringify(keys, null, 2));
            }
            logger.info("Original size: " + inputFileSizeInBytes.toLocaleString('en-US', { minimumFractionDigits: 0 }));
            logger.info("New size:      " + outputFileSizeInBytes.toLocaleString('en-US', { minimumFractionDigits: 0 }));
            logger.info("Reduction:     " + percentage.toLocaleString('en-US', { minimumFractionDigits: 2 }) + "%");
        }
        done();
    });
}
function getCoordinateReferenceSystem(crsName, cb) {
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
}
function minifyPropertyKeys(props) {
    var newProps = {};
    for (var key in props) {
        var replace = void 0;
        if (keys.hasOwnProperty(key)) {
            replace = keys[key];
        }
        else {
            replace = smartKey(key);
            if (!replace) {
                do {
                    replace = convertToNumberingScheme(lastKey++);
                } while (reversedKeys.hasOwnProperty(replace));
            }
            keys[key] = replace;
            reversedKeys[replace] = key;
        }
        newProps[replace] = props[key];
    }
    return newProps;
}
function smartKey(key) {
    var id = 'id';
    key = key.toLowerCase();
    if (key === id) {
        if (!reversedKeys.hasOwnProperty(id))
            return id;
    }
    var replace = key.trim()[0];
    return reversedKeys.hasOwnProperty(replace) ? undefined : replace;
}
function prune(props, blacklist, whitelist) {
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
}
function convertToNumberingScheme(counter) {
    var baseChar = ("a").charCodeAt(0);
    var letters = "";
    do {
        counter -= 1;
        letters = String.fromCharCode(baseChar + (counter % 26)) + letters;
        counter = (counter / 26) >> 0;
    } while (counter > 0);
    return letters;
}
//# sourceMappingURL=minify-geojson.js.map