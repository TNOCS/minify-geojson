import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as proj4 from 'proj4';
import * as shapefile from 'shapefile';
import * as reproject from 'reproject';
import { ITopoJSON, ITopology } from './topology';
import { ICommandOptions } from './cli';
import { CommandLineInterface } from './minify-geojson-cli';
import { FeatureCollection, GeometryObject, Feature } from 'geojson';
import { reportLog, convertQueryToPropertyFilters } from './utils';

export class MinifyGeoJSON {
  private logger: (message?: any, ...optionalParams: any[]) => void = console.log;
  // Re-use the keys acrross files.
  private keys: { [key: string]: string }; // original key to new key
  private reversedKeys: { [key: string]: string } = {}; // new key to original key
  private lastKey = 1;

  constructor(private options: ICommandOptions) {
    options.src.forEach(s => {
      const file = path.resolve(s);
      if (!fs.existsSync(file)) {
        console.error(`${file} does not exist! Are you perhaps missing a "?\n`);
        return;
      }
      this.loadFile(file, options, (geojson) => {
        if (!geojson) throw new Error('Could not read input file!');
        const ext = options.topo ? '.min.topojson' : '.min.geojson';
        const outputFile = file.replace(/\.[^/.]+$/, ext);

        if (options.filter) { geojson = this.filter(geojson, options.filter); }

        if (options.reproject) {
          let crsName = options.reproject.toUpperCase();
          if (!crsName.match(/^EPSG:/)) crsName = `EPSG:${crsName}`;
          this.logger(`REPROJECTING from ${crsName} to WGS84`);
          this.getCoordinateReferenceSystem(crsName, (crss) => {
            geojson = reproject.toWgs84(geojson, crss, crss);
            this.processGeoJSON(geojson, file, outputFile, options, () => { });
          });
        } else {
          this.processGeoJSON(geojson, file, outputFile, options, () => { });
        }
      });
    });
  }

  filter(geojson: FeatureCollection<GeometryObject>, filterQuery: string) {
    const filters = convertQueryToPropertyFilters(filterQuery);

    geojson.features = geojson.features.filter(feature => {
      let pass = true;
      filters.some(f => {
        if (f(feature.properties)) { return false; }
        pass = false;
        return true;
      });
      return pass;
    });

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
    let geojson: GeoJSON.FeatureCollection<GeoJSON.GeometryObject>;
    const ext = path.extname(inputFile);

    if (ext.match(/json$/i)) {
      fs.readFile(inputFile, 'utf8', (err, data) => {
        if (err) throw err;

        geojson = JSON.parse(data);
        geojson.type = 'FeatureCollection'; // this is sometimes missing
        cb(geojson);
      });
    } else if (ext.match(/shp$/i)) {
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
    const minifyKeys = options.keys;
    const minifyCoordinates = options.coordinates;
    const whitelist: string[] = options.whitelist ? options.whitelist.split(',').map(e => e.trim()) : undefined;
    const blacklist: string[] = options.blacklist ? options.blacklist.split(',').map(e => e.trim()) : undefined;

    // Process the property keys
    if (minifyKeys || blacklist || whitelist) {
      this.keys = minifyKeys ? {} : undefined;
      geojson.features.forEach(f => {
        if (f.properties) {
          if (blacklist || whitelist) f.properties = this.prune(f.properties, blacklist, whitelist);
          if (minifyKeys) { f.properties = this.minifyPropertyKeys(f.properties); }
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
      this.logger('CONVERTING to TopoJSON');
      let topojson: ITopoJSON = require('topojson');
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
      if (options.verbose) { reportLog(this.logger, inputFile, outputFile, this.keys); }
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
    const crss = require('./crs-defs');
    for (const k in crss) {
      crss[k] = proj4(crss[k]);
    }

    if (crss[crsName]) { return cb(crss[crsName]); }

    const crsPath = crsName.toLowerCase().replace(':', '/');
    const url = 'http://www.spatialreference.org/ref/' + crsPath + '/proj4/';
    let crsDef = '';

    http.get(url, res => {
      if (res.statusCode !== 200) {
        throw new Error(`Spatialreference.org responded with HTTP ${res.statusCode} while looking up "${crsName}".`);
      }
      res.on('data', chunk => {
        crsDef += chunk;
      }).on('end', () => {
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
    const newProps: { [key: string]: any } = {};
    for (const key in props) {
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
    for (const key in props) {
      if (blacklist && blacklist.indexOf(key) >= 0) continue;
      if (whitelist && whitelist.indexOf(key) < 0) continue;
      newProps[key] = props[key];
    }
    return newProps;
  }

  private convertToNumberingScheme(counter: number) {
    const baseChar = ('a').charCodeAt(0);
    let letters = '';

    do {
      counter -= 1;
      letters = String.fromCharCode(baseChar + (counter % 26)) + letters;
      counter = (counter / 26) >> 0;
    } while (counter > 0);

    return letters;
  }
}
