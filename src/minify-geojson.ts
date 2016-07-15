import fs = require('fs');
import path = require('path');
import winston = require('winston');

export interface ICommandOptions {
    keys: boolean,
    includeKeyMap: boolean,
    topo: boolean,
    verbose: boolean,
    coordinates: number,
    src: string[],
    whitelist: string,
    blacklist: string
}

export interface ITopologyOptions {
    /**
     * Informational messages will be output to stderr
     * 
     * @type {boolean}
     */
    verbose?: boolean,
    /**
     * Either "cartesian", "spherical" or null to infer the coordinate system automatically
     * 
     * @type {("cartesian" | "spherical" | "")}
     */
    "coordinate-system"?: "cartesian" | "spherical" | "",
    /**
     * If truthy and using spherical coordinates, polar antimeridian cuts will be stitched 
     * 
     * @type {boolean}
     */
    "stitch-poles"?: boolean,
    /**
     * Quantization precision; the maximum number of differentiable points per dimension. 
     * 
     * @type {number}
     */
    quantization?: number,
    /**
     * A function for computing the id of each input feature. 
     * 
     * @type {Function}
     */
    id?: Function,
    /**
     * A function for remapping properties.
     * 
     * @type {Function}
     */
    "property-transform"?: Function
}

export interface ITopology {
}

export interface ITopoJSON {
    /**
     * Convert to TopoJSON 
     * 
     * @param {{ collection: GeoJSON.FeatureCollection<GeoJSON.GeometryObject> }} collection
     */
    topology(collection: { collection: GeoJSON.FeatureCollection<GeoJSON.GeometryObject> }, options?: ITopologyOptions): ITopology;
    /**
     * Simplifies the topology.
     * 
     * @param {ITopology} topo
     * @param {{ verbose: boolean }} [options]
     * @returns {ITopology}
     */
    simplify(topo: ITopology, options?: { verbose?: boolean, "coordinate-system": string }): ITopology;
    /**
     * Removes any unused arcs from the specified topology.
     * 
     * @param {ITopology} topo
     * @param {{ verbose: boolean }} [options]
     * @returns {ITopology}
     */
    prune(topo: ITopology, options?: { verbose: boolean }): ITopology;
    filter(topo: ITopology, options?: { verbose: boolean }): ITopology;
    clockwise(topo: ITopology, options?: { verbose: boolean }): ITopology;
}

const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage')

const optionDefinitions = [
    { name: 'keys', alias: 'k', type: Boolean, typeLabel: '[underline]{Boolean}', description: 'Minify property keys, e.g. id remains id, telephone becomes t, address a etc.' },
    { name: 'includeKeyMap', alias: 'i', type: Boolean, typeLabel: '[underline]{Boolean}', description: 'Add the key map to the GeoJSON file. Requires the -k flag too.' },
    { name: 'topo', alias: 't', type: Boolean, typeLabel: '[underline]{Boolean}', description: 'Output format is TopoJSON instead of GeoJSON' },
    { name: 'blacklist', alias: 'b', type: String, typeLabel: '[underline]{String}', description: 'Comma separated list of properties that should be removed (others will be kept). Note that keys will not be minified unless the -k flag is used too.' },
    { name: 'whitelist', alias: 'w', type: String, typeLabel: '[underline]{String}', description: 'Comma separated list of properties that should be kept (others will be removed). Note that keys will not be minified unless the -k flag is used too.' },
    { name: 'coordinates', alias: 'c', type: Number, defaultOption: false, typeLabel: '[underline]{Positive number}', description: 'Only keep the first [italic]{n} digits of each coordinate.' },
    { name: 'src', alias: 's', type: String, multiple: true, defaultOption: true, typeLabel: '[underline]{File names}', description: 'Source files to process: you do not need to supply the -s flag.' },
    { name: 'verbose', alias: 'v', type: Boolean, typeLabel: '[underline]{Boolean}', description: 'Output is verbose.' }
];


const sections = [{
        header: 'Minify GeoJSON',
        content: 'For each input file, minify (compress) a GeoJSON by replacing the attribute keys with a shorter representation (typically, its first letter). You can also reduce the number of decimals for coordinates, and whitelist and blacklist certain properties..'
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
            desc: '7. Convert to output to topojson (-i and -c are not used)',
            example: '$ minify-geojson -kt original.geojson'
        }, {
            desc: '8. Full example',
            example: '$ minify-geojson -ktiv -w "property1, property2" -c 5 original.geojson'
        }]
    }
];

const options: ICommandOptions = commandLineArgs(optionDefinitions);
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ level: options.verbose ? 'info' : 'warning' })
    ]
});

// Re-use the keys acrross files.
var keys: { [key: string]: string } = {}; // original key to new key
var reversedKeys: { [key: string]: string } = {}; // new key to original key
let lastKey = 1;

if (!options.src) {
    const usage = getUsage(sections);
    console.log(usage);
} else {
    options.src.forEach(s => {
        let file = path.isAbsolute(s) ? s : path.join(process.cwd(), s);
        if (fs.existsSync(file)) minifyFile(file, options, () => { });
    });
}

/**
 * Minify the input (shape or GeoJSON) file.
 * 
 * @param {string} inputFile
 * @param {ICommandOptions} options
 * @param {Function} done
 * @returns
 */
function minifyFile(inputFile: string, options: ICommandOptions, done: Function) {
    if (!(options.keys || options.coordinates || options.whitelist || options.blacklist)) return;

    let ext = options.topo ? ".min.topojson" : ".min.geojson";
    let outputFile = inputFile.replace(/\.[^/.]+$/, ext);

    let geojson: GeoJSON.FeatureCollection<GeoJSON.GeometryObject>;

    if (inputFile.match(/json$/i)) {
        fs.readFile(inputFile, 'utf8', (err, data) => {
            if (err) throw err;

            geojson = JSON.parse(data);
            geojson.type = "FeatureCollection"; // this is sometimes missing

            processGeoJSON(geojson, inputFile, outputFile, options, done);
        });
    } else if (inputFile.match(/shp$/i)) {
        let shapefile = require('shapefile');
        shapefile.read(inputFile, (err, geojson)=> {
            if (err) throw err;

            processGeoJSON(geojson, inputFile, outputFile, options, done);
        }); 
    }
}

/**
 * Minify the GeoJSON file.
 * 
 * @param {GeoJSON.FeatureCollection<GeoJSON.GeometryObject>} geojson
 * @param {string} inputFile
 * @param {string} outputFile
 * @param {ICommandOptions} options
 * @param {Function} done
 */
function processGeoJSON(geojson: GeoJSON.FeatureCollection<GeoJSON.GeometryObject>, inputFile: string, outputFile: string, options: ICommandOptions, done: Function) {
    let minifyKeys = options.keys;
    let minifyCoordinates = options.coordinates;
    let whitelist: string[];
    let blacklist: string[];
    if (options.whitelist) whitelist = options.whitelist.split(',').map(e => e.trim());
    if (options.blacklist) blacklist = options.blacklist.split(',').map(e => e.trim());

        // Process the property keys
        if (minifyKeys || blacklist || whitelist) {
            geojson.features.forEach(f => {
                if (f.properties) {
                    if (blacklist || whitelist) f.properties = prune(f.properties, blacklist, whitelist);
                    if (minifyKeys) f.properties = minifyPropertyKeys(f.properties);
                }
            });
        }
        // Preserver map
        if (minifyKeys && options.includeKeyMap) {
            geojson['map'] = reversedKeys; 
        }
        let json = <any> geojson;
        // Convert to topojson
        if (options.topo) {
            // Overwrite the current GeoJSON object with a TopoJSON representation
            logger.info('CONVERTING TO TOPOJSON')
            let topojson: ITopoJSON = require("topojson");
            let topology = topojson.topology( {collection: geojson }, { verbose: options.verbose, 'property-transform': (feature) => { return feature.properties; }});
            topology = topojson.prune(topology, { verbose: options.verbose });
            topology = topojson.simplify(topology, { verbose: options.verbose, 'coordinate-system': 'spherical' });
            json = topology;
        }

        let minified: string;
        if (!options.topo && typeof minifyCoordinates === 'number' && minifyCoordinates > 0) {
            minified = JSON.stringify(json, (key, val) => {
                if (isNaN(+key)) return val;
                return val.toFixed ? Number(val.toFixed(minifyCoordinates)) : val;
            });
        } else {
            minified = JSON.stringify(json);
        }
        fs.writeFile(outputFile, minified, (err) => {
            if (err) throw err;

            if (options.verbose) {
                let inputStats = fs.statSync(inputFile);
                let inputFileSizeInBytes = inputStats["size"];
                let outputStats = fs.statSync(outputFile);
                let outputFileSizeInBytes = outputStats["size"];
                let percentage = 100 * (inputFileSizeInBytes - outputFileSizeInBytes) / inputFileSizeInBytes;
                logger.info(`${inputFile} minified successfully to ${outputFile}!`);
                if (minifyKeys) {
                    logger.info('Key mapping:');
                    logger.info(JSON.stringify(keys, null, 2));
                }
                logger.info(`Original size: ${inputFileSizeInBytes.toLocaleString('en-US', { minimumFractionDigits: 0 })}`);
                logger.info(`New size:      ${outputFileSizeInBytes.toLocaleString('en-US', { minimumFractionDigits: 0 })}`);
                logger.info(`Reduction:     ${percentage.toLocaleString('en-US', { minimumFractionDigits: 2 })}%`);
            }
            done();
        });
}

/**
 * Minifies the property keys. 
 * 
 * @param {{ [key: string]: any }} props
 * @returns
 */
function minifyPropertyKeys(props: { [key: string]: any }) {
    let newProps: { [key: string]: any } = {};
    for (var key in props) {
        let replace: string;
        if (keys.hasOwnProperty(key)) {
            replace = keys[key];
        } else {
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

/**
 * Try to find an intelligent match, i.e. id remains, otherwise, try to use the first letter of the word. 
 * 
 * @param {string} key
 * @returns
 */
function smartKey(key: string) {
    const id = 'id';
    key = key.toLowerCase();
    if (key === id) {
        // Case 1: check for an id
        if (!reversedKeys.hasOwnProperty(id)) return id;
    } 
    // Case 2: can we use the first letter (ignoring white space)
    let replace = key.trim()[0];
    return reversedKeys.hasOwnProperty(replace) ? undefined : replace; 
}

/**
 * Remove all properties that are on the blacklist and not on the whitelist. 
 * 
 * @param {{ [key: string]: any }} props
 */
function prune(props: { [key: string]: any }, blacklist: string[], whitelist: string[]) {
    if (!blacklist && !whitelist) return props;
    let newProps: { [key: string]: any } = {};
    for (var key in props) {
        if (blacklist && blacklist.indexOf(key) >= 0) continue;
        if (whitelist && whitelist.indexOf(key) < 0) continue;
        newProps[key] = props[key];
    }
    return newProps;
}

function convertToNumberingScheme(counter: number) {
    const baseChar = ("a").charCodeAt(0);
    let letters = "";

    do {
        counter -= 1;
        letters = String.fromCharCode(baseChar + (counter % 26)) + letters;
        counter = (counter / 26) >> 0;
    } while (counter > 0);

    return letters;
}
