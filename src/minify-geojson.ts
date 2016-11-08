import fs = require('fs');
import path = require('path');
import winston = require('winston');

import { ITopoJSON, ITopology } from './topology';
import { ICommandOptions } from './cli';
import { CommandLineInterface } from './minify-geojson-cli';

export class MinifyGeoJSON {
    private logger: winston.LoggerInstance;
    // Re-use the keys acrross files.
    private keys: { [key: string]: string } = {}; // original key to new key
    private reversedKeys: { [key: string]: string } = {}; // new key to original key
    private lastKey = 1;

    constructor(private options: ICommandOptions) {
        this.logger = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)({ level: options.verbose ? 'info' : 'warning' })
            ]
        });

        options.src.forEach(s => {
            let file = path.resolve(s);
            if (fs.existsSync(file)) {
                this.loadFile(file, options, (geojson) => {
                    if (!geojson) throw new Error('Could not read input file!');
                    let ext = options.topo ? ".min.topojson" : ".min.geojson";
                    let outputFile = file.replace(/\.[^/.]+$/, ext);

                    if (options.filter) geojson = this.filter(geojson, options.filter);

                    if (options.reproject) {
                        let crsName = options.reproject.toUpperCase();
                        if (!crsName.match(/^EPSG:/)) crsName = `EPSG:${crsName}`;
                        this.logger.info(`REPROJECTING from ${crsName} to WGS84`);
                        this.getCoordinateReferenceSystem(crsName, (crss) => {
                            let reproject = require('reproject');
                            geojson = reproject.toWgs84(geojson, crss, crss);
                            this.processGeoJSON(geojson, file, outputFile, options, () => { });
                        });
                    } else {
                        this.processGeoJSON(geojson, file, outputFile, options, () => { });
                    }
                });
            }
        });
    }

    filter(geojson: GeoJSON.FeatureCollection<GeoJSON.GeometryObject>, filterQuery: string) {
        const re = /^([a-zA-Z_ 0-9]*)([<>=]{1,2})([a-zA-Z_ 0-9]*)$/;

        let filteredFeatures: GeoJSON.Feature<GeoJSON.GeometryObject>[] = [];

        // See TypeScript currying: https://basarat.gitbooks.io/typescript/content/docs/tips/currying.html
        let filter = (prop: string) => (op: string) => (val: string) => (props: Object) => {
            if (!props.hasOwnProperty(prop)) return false;
            switch (op.trim()) {
                case '=': return props[prop] === val;
                case '<': return props[prop] < val;
                case '>': return props[prop] > val;
                case '<=': return props[prop] <= val;
                case '>=': return props[prop] >= val;
                default: throw new Error(`Operator ${op} is not supported!`);
            }
        };

        let queries = filterQuery.split(',').map(q => q.trim());
        let filters = [];
        queries.forEach(q => {
            let m = re.exec(q);
            if (!m || m.length !== 4) {
                throw new Error('Filters should be in the form PROPERTY OPERATOR VALUE, where property is a string, OPERATOR is <, =, >, <= or >=, and VALUE is a string or number.');
            }
            filters.push(filter(m[1].trim())(m[2].trim())(m[3].trim()));
        });

        filteredFeatures = geojson.features.filter(feature => {
            let pass = true;
            filters.some(f => {
                if (f(feature.properties)) return false;
                pass = false;
                return true;
            });
            return pass;
        });

        geojson.features = filteredFeatures;
        return geojson;
    }

    /**
     * Minify the input (shape or GeoJSON) file.
     * 
     * @param {string} inputFile
     * @param {ICommandOptions} options
     * @param {Function} callback(GeoJSON?)
     */
    private loadFile(inputFile: string, options: ICommandOptions, cb: (geojson?: GeoJSON.FeatureCollection<GeoJSON.GeometryObject>) => void) {
        if (!(options.keys || options.coordinates || options.whitelist || options.blacklist)) return cb();

        let geojson: GeoJSON.FeatureCollection<GeoJSON.GeometryObject>;
        let ext = path.extname(inputFile);

        if (ext.match(/json$/i)) {
            fs.readFile(inputFile, 'utf8', (err, data) => {
                if (err) throw err;

                geojson = JSON.parse(data);
                geojson.type = "FeatureCollection"; // this is sometimes missing
                cb(geojson);
            });
        } else if (ext.match(/shp$/i)) {
            let shapefile = require('shapefile');
            shapefile.read(inputFile, (err, geojson) => {
                if (err) throw err;
                cb(geojson);
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
    private processGeoJSON(geojson: GeoJSON.FeatureCollection<GeoJSON.GeometryObject>, inputFile: string, outputFile: string, options: ICommandOptions, done: Function) {
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
                    if (blacklist || whitelist) f.properties = this.prune(f.properties, blacklist, whitelist);
                    if (minifyKeys) f.properties = this.minifyPropertyKeys(f.properties);
                }
            });
        }
        // Preserver map
        if (minifyKeys && options.includeKeyMap) {
            geojson['map'] = this.reversedKeys;
        }
        let json = <any>geojson;
        // Convert to topojson
        if (options.topo) {
            // Overwrite the current GeoJSON object with a TopoJSON representation
            this.logger.info('CONVERTING to TopoJSON')
            let topojson: ITopoJSON = require("topojson");
            let topology = topojson.topology({ collection: geojson }, { verbose: options.verbose, 'property-transform': (feature) => { return feature.properties; } });
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
                this.logger.info(`${inputFile} minified successfully to ${outputFile}!`);
                if (minifyKeys) {
                    this.logger.info('Key mapping:');
                    this.logger.info(JSON.stringify(this.keys, null, 2));
                }
                this.logger.info(`Original size: ${inputFileSizeInBytes.toLocaleString('en-US', { minimumFractionDigits: 0 })}`);
                this.logger.info(`New size:      ${outputFileSizeInBytes.toLocaleString('en-US', { minimumFractionDigits: 0 })}`);
                this.logger.info(`Reduction:     ${percentage.toLocaleString('en-US', { minimumFractionDigits: 2 })}%`);
            }
            done();
        });
    }

    /**
     * Retrieve the CRS (Coordinate Reference System) online.
     * 
     * @param {string} crsName
     * @param {Function} cb Callback function
     * 
     */
    private getCoordinateReferenceSystem(crsName: string, cb: (crss: Object) => void) {
        let http = require('http');
        let proj4 = require('proj4');

        let crss = require('./crs-defs');
        for (var k in crss) {
            crss[k] = proj4(crss[k]);
        }

        if (crss[crsName]) return cb(crss[crsName]);

        let crsPath = crsName.toLowerCase().replace(':', '/'),
            url = "http://www.spatialreference.org/ref/" + crsPath + "/proj4/",
            crsDef = '';

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

    /**
     * Minifies the property keys. 
     * 
     * @param {{ [key: string]: any }} props
     * @returns
     */
    private minifyPropertyKeys(props: { [key: string]: any }) {
        let newProps: { [key: string]: any } = {};
        for (var key in props) {
            let replace: string;
            if (this.keys.hasOwnProperty(key)) {
                replace = this.keys[key];
            } else {
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
    }

    /**
     * Try to find an intelligent match, i.e. id remains, otherwise, try to use the first letter of the word. 
     * 
     * @param {string} key
     * @returns
     */
    private smartKey(key: string) {
        const id = 'id';
        key = key.toLowerCase();
        if (key === id) {
            // Case 1: check for an id
            if (!this.reversedKeys.hasOwnProperty(id)) return id;
        }
        // Case 2: can we use the first letter (ignoring white space)
        let replace = key.trim()[0];
        return this.reversedKeys.hasOwnProperty(replace) ? undefined : replace;
    }

    /**
     * Remove all properties that are on the blacklist and not on the whitelist. 
     * 
     * @param {{ [key: string]: any }} props
     */
    private prune(props: { [key: string]: any }, blacklist: string[], whitelist: string[]) {
        if (!blacklist && !whitelist) return props;
        let newProps: { [key: string]: any } = {};
        for (var key in props) {
            if (blacklist && blacklist.indexOf(key) >= 0) continue;
            if (whitelist && whitelist.indexOf(key) < 0) continue;
            newProps[key] = props[key];
        }
        return newProps;
    }

    private convertToNumberingScheme(counter: number) {
        const baseChar = ("a").charCodeAt(0);
        let letters = "";

        do {
            counter -= 1;
            letters = String.fromCharCode(baseChar + (counter % 26)) + letters;
            counter = (counter / 26) >> 0;
        } while (counter > 0);

        return letters;
    }

}
