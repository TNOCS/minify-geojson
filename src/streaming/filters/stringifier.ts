import { Transform } from 'stream';
import { SimplifyKeys } from './simplify-keys';

/**
 * Convert object back to string.
 */
export class Stringifier extends Transform {
  private firstTime = true;

  constructor(simplifier?: SimplifyKeys) {
    super({
      objectMode: true,
      final: done => {
        this.push(']'); // End Features array
        // Optionally, add key map
        if (simplifier && simplifier.keyMap && Object.keys(simplifier.keyMap.map).length > 0) {
          this.push(',"map":' + JSON.stringify(simplifier.keyMap.map));
        }
        // Close GeoJSON file
        this.push('}');
        done(null);
      },
    });
  }

  public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err?, data?) => void) {
    if (this.firstTime) {
      this.firstTime = false;
      this.push(JSON.stringify(geojson));
    } else {
       this.push(',' + JSON.stringify(geojson));
    }
    done();
  }
}
