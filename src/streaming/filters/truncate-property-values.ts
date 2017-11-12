import * as stream from 'stream';

/**
 * Truncate the number of decimals that are used for property values (only affects numbers)
 */
export class TruncatePropertyValues extends stream.Transform {
  constructor(private truncValue: number) {
    super({ objectMode: true });
  }

  public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err, data) => void) {
    for (const key in geojson.properties) {
      if (!geojson.properties.hasOwnProperty(key) || isNaN(geojson.properties[key])) { continue; }
      geojson.properties[key] = (+geojson.properties[key]).toFixed(this.truncValue);
    }

    done(null, geojson);
  }
}

