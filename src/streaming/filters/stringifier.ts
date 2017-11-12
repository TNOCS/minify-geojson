import * as stream from 'stream';

/**
 * Convert object back to string.
 */
export class Stringifier extends stream.Transform {
  constructor() {
    super({ objectMode: true });
  }

  public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err?, data?) => void) {
    this.push(JSON.stringify(geojson));
    done();
  }
}
