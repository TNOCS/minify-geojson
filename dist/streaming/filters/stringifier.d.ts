/// <reference types="node" />
import { Transform } from 'stream';
import { SimplifyKeys } from './simplify-keys';
export declare class Stringifier extends Transform {
    private firstTime;
    constructor(simplifier?: SimplifyKeys);
    _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err?, data?) => void): void;
}
