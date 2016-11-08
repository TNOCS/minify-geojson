import * as fs from 'fs';
import * as stream from 'stream';

var pump = require('pump');
var OgrJsonStream = require('ogr-json-stream');
var parser = OgrJsonStream();

var count = 0;

let inputFile = "c:\\Users\\erikv\\Downloads\\3D-GebouwhoogteNL_2015\\3D-GebouwhoogteNL_Data\\3dGebouwhoogteNL.geojson";
let outputFile = inputFile.replace('.geojson', '.min.geojson');

var source = fs.createReadStream(inputFile);
var sink = fs.createWriteStream(outputFile, { encoding: 'utf8' });
sink.on('open', () => { sink.write('{type: "FeatureCollection",features:['); });
sink.on('end', () => { sink.write(']}'); });

/** Removes empty properties */
export class PruneEmptyProperties extends stream.Transform {
    private count = 0;

    constructor() {
        super({ objectMode: true });
    }

    public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err, data) => void) {
        this.count++;

        for (var key in geojson.properties) {
            if (!geojson.properties.hasOwnProperty(key)) continue;
            if (geojson.properties[key] === null) delete geojson.properties[key];
        }

        done(null, geojson);
    }

    public _flush(done: (err, data) => void) {
        console.log(`I've counted ${this.count} objects`);
        done(null, {});
    }
}

/** Truncate the number of decimals that are used for property values (only affects numbers) */
export class TruncatePropertyValues extends stream.Transform {
    private isNumber = /[-\d.]+/
    constructor(private truncValue: number) {
        super({ objectMode: true });
    }

    public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err, data) => void) {
        for (var key in geojson.properties) {
            if (!geojson.properties.hasOwnProperty(key)) continue;
            if (isNaN(geojson.properties[key])) continue; 
            geojson.properties[key] = +(+geojson.properties[key]).toFixed(this.truncValue);
        }

        done(null, geojson);
    }
}

/** Truncate the geometry coordinates */
export class TruncateCoordinates extends stream.Transform {
    constructor(private truncValue: number) {
        super({ objectMode: true });
    }

    public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err, data) => void) {
        geojson.geometry.coordinates = geojson.geometry.coordinates.map(arr => { return this.truncateArrayRecursively(arr); });
        done(null, geojson);
    }

    private truncateArrayRecursively(arr: Array<any>) {
        let result = [];
        arr.forEach(a => {
            if (a instanceof Array) {
                result.push(this.truncateArrayRecursively(a));
            } else {
                result.push(a.toFixed(this.truncValue));
            }
        });
        return result;
    }
}

/** Blacklist and whitelist filter: blacklist properties are removed, whitelist properties are maintained. */
export class BlackWhiteListFilter extends stream.Transform {
    private whitelist: string[];
    private blacklist: string[];

    constructor(whitelist: string[], blacklist: string[]) {
        super({ objectMode: true });
        if (whitelist) this.whitelist = whitelist.map(i => { return i.trim(); });
        if (blacklist) this.blacklist = blacklist.map(i => { return i.trim(); });
    }

    public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err, data) => void) {
        for (var key in geojson.properties) {
            if (!geojson.properties.hasOwnProperty(key)) continue;
            if (this.whitelist && this.whitelist.indexOf(key) >= 0) continue;
            if (this.blacklist && this.blacklist.indexOf(key) < 0) continue;
            delete geojson.properties[key];
        }

        done(null, geojson);
    }
}

export class SimplifyKeys extends stream.Transform {
    private keys: { [key: string]: string } = {}; // original key to new key
    private reversedKeys: { [key: string]: string } = {}; // new key to original key
    private lastKey = 1;

    constructor() {
        super({ objectMode: true });
    }

    public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err?, data?) => void) {
        geojson.properties = this.minifyPropertyKeys(geojson.properties);
        done(null, geojson);
    }

    public _flush(done: (err, data) => void) {
        console.log('Key map:');
        console.log(JSON.stringify(this.reversedKeys, null, 2));
        done(null, {});
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

export class Stringifier extends stream.Transform {
    constructor() {
        super({ objectMode: true });
    }

    public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err?, data?) => void) {
        this.push(JSON.stringify(geojson));
        done();
    }
}

let pruneEmpty = new PruneEmptyProperties();
let truncateCoords = new TruncateCoordinates(7);
let truncateProps = new TruncatePropertyValues(2);
let bwFilter = new BlackWhiteListFilter(null, ["top10_id", "dimensie"]);
let simplifyKeys = new SimplifyKeys();
let stringifier = new Stringifier();

let filters = [ source, parser, // required
    pruneEmpty, bwFilter, simplifyKeys, truncateProps, truncateCoords, // optional 
    stringifier, sink ]; // required

pump(
    filters,
    (err) => {
        console.log('pipe finished', err)
    }
);
