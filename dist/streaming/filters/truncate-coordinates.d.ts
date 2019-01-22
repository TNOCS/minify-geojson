/// <reference types="node" />
import * as stream from 'stream';
import { Feature, Polygon } from 'geojson';
export declare class TruncateCoordinates extends stream.Transform {
    private truncValue;
    constructor(truncValue: number);
    _transform(geojson: Feature<Polygon>, encoding: string, done: (err: any, data: any) => void): void;
}
