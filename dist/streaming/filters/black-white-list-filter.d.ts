/// <reference types="node" />
import * as stream from 'stream';
export declare class BlackWhiteListFilter extends stream.Transform {
    private whitelist;
    private blacklist;
    constructor(whitelist: string[], blacklist: string[]);
    _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err: any, data: any) => void): void;
}
