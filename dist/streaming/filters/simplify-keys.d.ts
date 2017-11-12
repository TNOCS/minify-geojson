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
    _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err?, data?) => void): void;
    _flush(done: (err, data) => void): void;
    private minifyPropertyKeys(props);
    private smartKey(key);
    private convertToNumberingScheme(counter);
}
