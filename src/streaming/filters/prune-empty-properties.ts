import { Transform } from 'stream';

/**
 * Remove empty properties from GeoJSON feature.
 */
export class PruneEmptyProperties extends Transform {
  public count = 0;

  constructor() {
    super({ objectMode: true });
  }

  public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err, data) => void) {
    this.count++;

    for (const key in geojson.properties) {
      if (!geojson.properties.hasOwnProperty(key)) continue;
      if (!geojson.properties[key]) delete geojson.properties[key];
    }

    done(null, geojson);
  }
}
