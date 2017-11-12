"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var pump = require("pump");
var minify_geojson_1 = require("./../minify-geojson");
var black_white_list_filter_1 = require("./filters/black-white-list-filter");
var truncate_property_values_1 = require("./filters/truncate-property-values");
var truncate_coordinates_1 = require("./filters/truncate-coordinates");
var prune_empty_properties_1 = require("./filters/prune-empty-properties");
var simplify_keys_1 = require("./filters/simplify-keys");
var stringifier_1 = require("./filters/stringifier");
var utils_1 = require("./../utils");
var property_filter_1 = require("./filters/property-filter");
var MinifyGeoJSONStreaming = (function () {
    function MinifyGeoJSONStreaming(options) {
        var _this = this;
        this.options = options;
        this.logger = console.log;
        var OgrJsonStream = require('ogr-json-stream');
        var parser = OgrJsonStream();
        var whitelist = options.whitelist ? options.whitelist.split(',').map(function (e) { return e.trim(); }) : undefined;
        var blacklist = options.blacklist ? options.blacklist.split(',').map(function (e) { return e.trim(); }) : undefined;
        options.src.forEach(function (s) {
            var simplifier = options.keys ? new simplify_keys_1.SimplifyKeys() : undefined;
            var pruneEmptyProps = new prune_empty_properties_1.PruneEmptyProperties();
            var inputFile = path.resolve(s);
            if (!fs.existsSync(inputFile)) {
                return;
            }
            if (path.extname(inputFile).match(/shp$/i)) {
                return new minify_geojson_1.MinifyGeoJSON(options);
            }
            var outputFile = inputFile.replace(/\.[^/.]+$/, '.min.geojson');
            var source = fs.createReadStream(inputFile, { encoding: 'utf8' });
            var sink = fs.createWriteStream(outputFile, { encoding: 'utf8' });
            sink.on('open', function () { return sink.write('{type: "FeatureCollection",features:['); });
            sink.on('end', function () {
                var keymap = options.keys && options.includeKeyMap ? JSON.stringify(simplifier.keyMap) : '';
                sink.write(keymap + "]}");
            });
            var filters = [
                source,
                parser,
                pruneEmptyProps
            ];
            if (options.filter) {
                filters.push(new property_filter_1.PropertyFilter(options.filter));
            }
            if (options.coordinates && !isNaN(options.coordinates)) {
                filters.push(new truncate_coordinates_1.TruncateCoordinates(+options.coordinates));
            }
            if (options.decimals) {
                filters.push(new truncate_property_values_1.TruncatePropertyValues(+options.decimals));
            }
            if (options.whitelist || options.blacklist) {
                filters.push(new black_white_list_filter_1.BlackWhiteListFilter(whitelist, blacklist));
            }
            if (options.keys) {
                filters.push(simplifier);
            }
            filters.push(new stringifier_1.Stringifier());
            filters.push(sink);
            pump(filters, function (err) {
                if (err) {
                    console.error(err);
                }
                else if (options.verbose) {
                    utils_1.reportLog(_this.logger, inputFile, outputFile, simplifier ? simplifier.keyMap.map : undefined, pruneEmptyProps.count);
                }
            });
        });
    }
    return MinifyGeoJSONStreaming;
}());
exports.MinifyGeoJSONStreaming = MinifyGeoJSONStreaming;
//# sourceMappingURL=minify-geojson-streaming.js.map