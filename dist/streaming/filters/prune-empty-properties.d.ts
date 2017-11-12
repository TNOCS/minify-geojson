/// <reference types="node" />
import * as stream from 'stream';
export declare class PruneEmptyProperties extends stream.Transform {
    count: number;
    constructor();
    _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err, data) => void): void;
}
