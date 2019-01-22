/// <reference types="node" />
import { Transform } from 'stream';
export declare class PropertyFilter extends Transform {
    private filters;
    constructor(filterQuery: string);
    _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err: any, data: any) => void): void;
}
