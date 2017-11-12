import { Transform } from 'stream';
import { convertQueryToPropertyFilters } from '../../utils';

/**
 * Remove properties where certain conditions are met from GeoJSON feature.
 */
export class PropertyFilter extends Transform {
  private filters: Array<(props: Object) => boolean>;

  constructor(filterQuery: string) {
    super({ objectMode: true });
    this.filters = convertQueryToPropertyFilters(filterQuery);
  }

  public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err, data) => void) {

    let pass = true;
    this.filters.some(f => {
      if (f(geojson.properties)) { return false; }
      pass = false;
      return true;
    });

    done(null, pass ? geojson : null);
  }

}