import * as stream from 'stream';
import { Feature, Polygon } from 'geojson';

/**
 * Truncate the geometry coordinates
 */
export class TruncateCoordinates extends stream.Transform {
  constructor(private truncValue: number) {
    super({ objectMode: true });
  }

  public _transform(geojson: Feature<Polygon>, encoding: string, done: (err, data) => void) {
    if (!geojson || !geojson.geometry) { return done(null, geojson ); }
    geojson.geometry.coordinates = JSON.parse(JSON.stringify(geojson.geometry.coordinates, (key, val) => {
      if (isNaN(+key)) return val;
      return val.toFixed ? Number(val.toFixed(this.truncValue)) : val;
    }));
    done(null, geojson);
  }

  // private truncateArrayRecursively(arr: number | Array<any>) {
  //   let result = [];
  //   if (typeof arr === 'number') { return arr.toFixed(this.truncValue); }
  //   arr.forEach(a => {
  //     if (a instanceof Array) {
  //       result.push(this.truncateArrayRecursively(a));
  //     } else {
  //       result.push((a as number).toFixed(this.truncValue));
  //     }
  //   });
  //   return result;
  // }
}
