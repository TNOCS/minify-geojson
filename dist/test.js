"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var fs = require('fs');
var stream = require('stream');
var pump = require('pump');
var OgrJsonStream = require('ogr-json-stream');
var parser = OgrJsonStream();
var count = 0;
var inputFile = "c:\\Users\\erikv\\Downloads\\3D-GebouwhoogteNL_2015\\3D-GebouwhoogteNL_Data\\3dGebouwhoogteNL.geojson";
var outputFile = inputFile.replace('.geojson', '.min.geojson');
var source = fs.createReadStream(inputFile);
var sink = fs.createWriteStream(outputFile, { encoding: 'utf8' });
sink.on('open', function () { sink.write('{type: "FeatureCollection",features:['); });
sink.on('end', function () { sink.write(']}'); });
var PruneEmptyProperties = (function (_super) {
    __extends(PruneEmptyProperties, _super);
    function PruneEmptyProperties() {
        _super.call(this, { objectMode: true });
        this.count = 0;
    }
    PruneEmptyProperties.prototype._transform = function (geojson, encoding, done) {
        this.count++;
        for (var key in geojson.properties) {
            if (!geojson.properties.hasOwnProperty(key))
                continue;
            if (geojson.properties[key] === null)
                delete geojson.properties[key];
        }
        done(null, geojson);
    };
    PruneEmptyProperties.prototype._flush = function (done) {
        console.log("I've counted " + this.count + " objects");
        done(null, {});
    };
    return PruneEmptyProperties;
}(stream.Transform));
exports.PruneEmptyProperties = PruneEmptyProperties;
var TruncatePropertyValues = (function (_super) {
    __extends(TruncatePropertyValues, _super);
    function TruncatePropertyValues(truncValue) {
        _super.call(this, { objectMode: true });
        this.truncValue = truncValue;
        this.isNumber = /[-\d.]+/;
    }
    TruncatePropertyValues.prototype._transform = function (geojson, encoding, done) {
        for (var key in geojson.properties) {
            if (!geojson.properties.hasOwnProperty(key))
                continue;
            if (isNaN(geojson.properties[key]))
                continue;
            geojson.properties[key] = +(+geojson.properties[key]).toFixed(this.truncValue);
        }
        done(null, geojson);
    };
    return TruncatePropertyValues;
}(stream.Transform));
exports.TruncatePropertyValues = TruncatePropertyValues;
var TruncateCoordinates = (function (_super) {
    __extends(TruncateCoordinates, _super);
    function TruncateCoordinates(truncValue) {
        _super.call(this, { objectMode: true });
        this.truncValue = truncValue;
    }
    TruncateCoordinates.prototype._transform = function (geojson, encoding, done) {
        var _this = this;
        geojson.geometry.coordinates = geojson.geometry.coordinates.map(function (arr) { return _this.truncateArrayRecursively(arr); });
        done(null, geojson);
    };
    TruncateCoordinates.prototype.truncateArrayRecursively = function (arr) {
        var _this = this;
        var result = [];
        arr.forEach(function (a) {
            if (a instanceof Array) {
                result.push(_this.truncateArrayRecursively(a));
            }
            else {
                result.push(a.toFixed(_this.truncValue));
            }
        });
        return result;
    };
    return TruncateCoordinates;
}(stream.Transform));
exports.TruncateCoordinates = TruncateCoordinates;
var BlackWhiteListFilter = (function (_super) {
    __extends(BlackWhiteListFilter, _super);
    function BlackWhiteListFilter(whitelist, blacklist) {
        _super.call(this, { objectMode: true });
        if (whitelist)
            this.whitelist = whitelist.map(function (i) { return i.trim(); });
        if (blacklist)
            this.blacklist = blacklist.map(function (i) { return i.trim(); });
    }
    BlackWhiteListFilter.prototype._transform = function (geojson, encoding, done) {
        for (var key in geojson.properties) {
            if (!geojson.properties.hasOwnProperty(key))
                continue;
            if (this.whitelist && this.whitelist.indexOf(key) >= 0)
                continue;
            if (this.blacklist && this.blacklist.indexOf(key) < 0)
                continue;
            delete geojson.properties[key];
        }
        done(null, geojson);
    };
    return BlackWhiteListFilter;
}(stream.Transform));
exports.BlackWhiteListFilter = BlackWhiteListFilter;
var SimplifyKeys = (function (_super) {
    __extends(SimplifyKeys, _super);
    function SimplifyKeys() {
        _super.call(this, { objectMode: true });
        this.keys = {};
        this.reversedKeys = {};
        this.lastKey = 1;
    }
    SimplifyKeys.prototype._transform = function (geojson, encoding, done) {
        geojson.properties = this.minifyPropertyKeys(geojson.properties);
        done(null, geojson);
    };
    SimplifyKeys.prototype._flush = function (done) {
        console.log('Key map:');
        console.log(JSON.stringify(this.reversedKeys, null, 2));
        done(null, {});
    };
    SimplifyKeys.prototype.minifyPropertyKeys = function (props) {
        var newProps = {};
        for (var key in props) {
            var replace = void 0;
            if (this.keys.hasOwnProperty(key)) {
                replace = this.keys[key];
            }
            else {
                replace = this.smartKey(key);
                if (!replace) {
                    do {
                        replace = this.convertToNumberingScheme(this.lastKey++);
                    } while (this.reversedKeys.hasOwnProperty(replace));
                }
                this.keys[key] = replace;
                this.reversedKeys[replace] = key;
            }
            newProps[replace] = props[key];
        }
        return newProps;
    };
    SimplifyKeys.prototype.smartKey = function (key) {
        var id = 'id';
        key = key.toLowerCase();
        if (key === id) {
            if (!this.reversedKeys.hasOwnProperty(id))
                return id;
        }
        var replace = key.trim()[0];
        return this.reversedKeys.hasOwnProperty(replace) ? undefined : replace;
    };
    SimplifyKeys.prototype.convertToNumberingScheme = function (counter) {
        var baseChar = ("a").charCodeAt(0);
        var letters = "";
        do {
            counter -= 1;
            letters = String.fromCharCode(baseChar + (counter % 26)) + letters;
            counter = (counter / 26) >> 0;
        } while (counter > 0);
        return letters;
    };
    return SimplifyKeys;
}(stream.Transform));
exports.SimplifyKeys = SimplifyKeys;
var Stringifier = (function (_super) {
    __extends(Stringifier, _super);
    function Stringifier() {
        _super.call(this, { objectMode: true });
    }
    Stringifier.prototype._transform = function (geojson, encoding, done) {
        this.push(JSON.stringify(geojson));
        done();
    };
    return Stringifier;
}(stream.Transform));
exports.Stringifier = Stringifier;
var pruneEmpty = new PruneEmptyProperties();
var truncateCoords = new TruncateCoordinates(7);
var truncateProps = new TruncatePropertyValues(2);
var bwFilter = new BlackWhiteListFilter(null, ["top10_id", "dimensie"]);
var simplifyKeys = new SimplifyKeys();
var stringifier = new Stringifier();
var filters = [source, parser,
    pruneEmpty, bwFilter, simplifyKeys, truncateProps, truncateCoords,
    stringifier, sink];
pump(filters, function (err) {
    console.log('pipe finished', err);
});
//# sourceMappingURL=test.js.map