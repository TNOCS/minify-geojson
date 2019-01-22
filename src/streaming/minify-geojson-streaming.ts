import * as fs from 'fs';
import * as path from 'path';
import * as pump from 'pump';
import { Transform } from 'stream';
import { MinifyGeoJSON } from './../minify-geojson';
import { BlackWhiteListFilter } from './filters/black-white-list-filter';
import { TruncatePropertyValues } from './filters/truncate-property-values';
import { TruncateCoordinates } from './filters/truncate-coordinates';
import { PruneEmptyProperties } from './filters/prune-empty-properties';
import { ICommandOptions } from '../cli';
import { SimplifyKeys } from './filters/simplify-keys';
import { Stringifier } from './filters/stringifier';
import { reportLog } from './../utils';
import { PropertyFilter } from './filters/property-filter';

export class MinifyGeoJSONStreaming {
  private logger = console.log;

  constructor(private options: ICommandOptions) {
    const OgrJsonStream = require('ogr-json-stream');
    const parser = OgrJsonStream();
    const whitelist = options.whitelist ? options.whitelist.split(',').map(e => e.trim()) : undefined;
    const blacklist = options.blacklist ? options.blacklist.split(',').map(e => e.trim()) : undefined;

    options.src.forEach(s => {
      const simplifier = options.keys ? new SimplifyKeys() : undefined;
      const pruneEmptyProps = new PruneEmptyProperties();
      const inputFile = path.resolve(s);
      if (!fs.existsSync(inputFile)) { return; }
      if (path.extname(inputFile).match(/shp$/i)) { return new MinifyGeoJSON(options); }
      const outputFile = inputFile.replace(/\.[^/.]+$/, '.min.geojson');
      const source = fs.createReadStream(inputFile, { encoding: 'utf8' });
      const sink = fs.createWriteStream(outputFile, { encoding: 'utf8', autoClose: true });
      sink.on('open', () => sink.write('{"type":"FeatureCollection","features":['));

      const filters: Transform[] = [
        source,
        parser,
        pruneEmptyProps
      ];
      if (options.filter) {
        filters.push(new PropertyFilter(options.filter));
      }
      if (options.coordinates && !isNaN(options.coordinates)) {
        filters.push(new TruncateCoordinates(+options.coordinates));
      }
      if (options.decimals) {
        filters.push(new TruncatePropertyValues(+options.decimals));
      }
      if (options.whitelist || options.blacklist) {
        filters.push(new BlackWhiteListFilter(whitelist, blacklist));
      }
      if (options.keys) {
        filters.push(simplifier);
      }
      filters.push(new Stringifier(options.includeKeyMap ? simplifier : undefined));
      filters.push(sink as any);

      pump(filters, (err: NodeJS.ErrnoException) => {
        if (err) {
          console.error(err);
        } else if (options.verbose) {
          reportLog(this.logger, inputFile, outputFile, simplifier ? simplifier.keyMap.map : undefined, pruneEmptyProps.count);
        }
      });

    });
  }
}
