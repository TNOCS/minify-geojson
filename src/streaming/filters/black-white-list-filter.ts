import * as stream from 'stream';


/**
 * Blacklist and whitelist filter: blacklist properties are removed, whitelist properties are maintained.
 */
export class BlackWhiteListFilter extends stream.Transform {
  private whitelist: string[];
  private blacklist: string[];

  constructor(whitelist: string[], blacklist: string[]) {
    super({ objectMode: true });
    if (whitelist) this.whitelist = whitelist.map(i => { return i.trim(); });
    if (blacklist) this.blacklist = blacklist.map(i => { return i.trim(); });
  }

  public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err, data) => void) {
    for (const key in geojson.properties) {
      if (!geojson.properties.hasOwnProperty(key)) continue;
      if (this.whitelist && this.whitelist.indexOf(key) >= 0) continue;
      if (this.blacklist && this.blacklist.indexOf(key) < 0) continue;
      delete geojson.properties[key];
    }

    done(null, geojson);
  }
}