/// <reference types="node" />
import * as stream from 'stream';
export declare class TruncatePropertyValues extends stream.Transform {
    private truncValue;
    constructor(truncValue: number);
    _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err, data) => void): void;
}
