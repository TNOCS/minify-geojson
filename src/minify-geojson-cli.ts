import { MinifyGeoJSONStreaming } from './streaming/minify-geojson-streaming';
import { ICommandOptions } from './cli';
import { MinifyGeoJSON } from './minify-geojson';
import * as commandLineArgs from 'command-line-args';
import { OptionDefinition } from 'command-line-args';

/**
 * Adds missing properties from typings.
 */
export interface FixedOptionDefinition extends OptionDefinition {
  description: string;
  typeLabel: string;
}

export class CommandLineInterface {
  static optionDefinitions: FixedOptionDefinition[] = [
    {
      name: 'keys',
      alias: 'k',
      type: Boolean,
      typeLabel: 'Boolean',
      description: 'Minify property keys, e.g. id remains id, telephone becomes t, address a etc.',
    },
    {
      name: 'includeKeyMap',
      alias: 'i',
      type: Boolean,
      typeLabel: 'Boolean',
      description: 'Add the key map to the GeoJSON file. Requires the -k flag too.',
    },
    {
      name: 'topo',
      alias: 't',
      type: Boolean,
      typeLabel: 'Boolean',
      description: 'Output format is TopoJSON instead of GeoJSON.',
    },
    {
      name: 'reproject',
      alias: 'r',
      type: String,
      typeLabel: 'String',
      description: 'Reproject to WGS84 by supplying the input EPSG coordinate system, e.g. -r EPSG:28992.',
    },
    {
      name: 'filter',
      alias: 'f',
      type: String,
      typeLabel: 'String',
      description:
        'Comma separted list of property filters, which will KEEP those features when the property filter returns true, e.g. filter "WATER = NO" will filter out feature\'s where "WATER": "NO".',
    },
    {
      name: 'blacklist',
      alias: 'b',
      type: String,
      typeLabel: 'String',
      description:
        'Comma separated list of properties that should be removed (others will be kept). Note that keys will not be minified unless the -k flag is used too.',
    },
    {
      name: 'whitelist',
      alias: 'w',
      type: String,
      typeLabel: 'String',
      description:
        'Comma separated list of properties that should be kept (others will be removed). Note that keys will not be minified unless the -k flag is used too.',
    },
    {
      name: 'coordinates',
      alias: 'c',
      type: Number,
      typeLabel: 'Positive number',
      description: 'Only keep the first n digits of each coordinate.',
    },
    {
      name: 'decimals',
      alias: 'd',
      type: Number,
      typeLabel: 'Positive number',
      description: 'Only keep the first n digits of each decimal property.',
    },
    {
      name: 'src',
      alias: 's',
      type: String,
      multiple: true,
      defaultOption: true,
      typeLabel: 'File names',
      description: 'Source files to process: you do not need to supply the -s flag.',
    },
    {
      name: 'verbose',
      alias: 'v',
      type: Boolean,
      typeLabel: 'Boolean',
      description: 'Output is verbose.',
    },
  ];

  static sections = [
    {
      header: 'Minify GeoJSON',
      content:
        'Minify (compress) each input GeoJSON or ESRI shapefile by replacing the attribute keys with a shorter representation (typically, its first letter). You can also reduce the number of decimals for coordinates and properties, whitelist and blacklist or filter certain properties. Output can be GeoJSON or TopoJSON. If you wish to reproject to WGS84, you can supply the EPSG code (which will be resolved via http://www.spatialreference.org/ref/epsg/YOURCODE/proj4/).',
    },
    {
      header: 'Options',
      optionList: CommandLineInterface.optionDefinitions,
    },
    {
      header: 'Examples',
      content: [
        {
          desc: '01. Shrink property keys and output to original.min.geojson',
          example: '$ minify-geojson -k original.geojson',
        },
        {
          desc: '02. A verbose version',
          example: '$ minify-geojson -kv original.geojson',
        },
        {
          desc: '03. Prune the blacklisted properties',
          example: '$ minify-geojson -b "property1, property2" original.geojson',
        },
        {
          desc: '04. Keep the whitelisted properties',
          example: '$ minify-geojson -w "property1, property2" original.geojson',
        },
        {
          desc: '05. Removes superfluous decimals (keep first 5)',
          example: '$ minify-geojson -c 5 original.geojson',
        },
        {
          desc: '06. Add the key mapping to the output',
          example: '$ minify-geojson -ki original.geojson',
        },
        {
          desc: '07. Convert output to topojson (-i and -c are not used)',
          example: '$ minify-geojson -kt original.geojson',
        },
        {
          desc: '08. Reproject shape file in RD (EPSG:28992) to TopoJSON',
          example: '$ minify-geojson -ktv -r 28992 original.shp',
        },
        {
          desc: '09. Filter based on properties',
          example: '$ minify-geojson -ktv -r 28992 -f "WATER = NO, CITY=Amsterdam" -b "WATER, CITY" original.shp',
        },
        {
          desc: '10. Full example',
          example: '$ minify-geojson -ktiv -w "property1, property2" -c 5 original.geojson',
        },
      ],
    },
  ];
}

const options = commandLineArgs(CommandLineInterface.optionDefinitions) as ICommandOptions;
if (!options.src) {
  console.error('Supplied options: ');
  console.error(options);
  console.error('\nNo source specified.\n');
  const getUsage = require('command-line-usage');
  const usage = getUsage(CommandLineInterface.sections);
  console.log(usage);
  process.exit(1);
}

const minifyGeoJSON =
  options.topo || options.reproject ? new MinifyGeoJSON(options) : new MinifyGeoJSONStreaming(options);

// Streaming does not support
// shapefile
// topojson
// projection
// filter WATER = TRUE
