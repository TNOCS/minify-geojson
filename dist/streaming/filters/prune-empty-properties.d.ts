/// <reference types="node" />
import { Transform } from 'stream';
export declare class PruneEmptyProperties extends Transform {
    count: number;
    constructor();
    _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err, data) => void): void;
}
