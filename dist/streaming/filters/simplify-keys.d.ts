/// <reference types="node" />
import * as stream from 'stream';
export declare class SimplifyKeys extends stream.Transform {
    private keys;
    private reversedKeys;
    private lastKey;
    constructor();
    readonly keyMap: {
        map: {
            [key: string]: string;
        };
    };
    _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err?: any, data?: any) => void): void;
    _flush(done: (err: any, data: any) => void): void;
    private minifyPropertyKeys;
    private smartKey;
    private convertToNumberingScheme;
}
