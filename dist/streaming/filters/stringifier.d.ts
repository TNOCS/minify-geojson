/// <reference types="node" />
import * as stream from 'stream';
export declare class Stringifier extends stream.Transform {
    constructor();
    _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err?, data?) => void): void;
}
