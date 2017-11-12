"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var stream = require("stream");
var TruncateCoordinates = (function (_super) {
    __extends(TruncateCoordinates, _super);
    function TruncateCoordinates(truncValue) {
        var _this = _super.call(this, { objectMode: true }) || this;
        _this.truncValue = truncValue;
        return _this;
    }
    TruncateCoordinates.prototype._transform = function (geojson, encoding, done) {
        var _this = this;
        if (!geojson || !geojson.geometry) {
            return done(null, geojson);
        }
        geojson.geometry.coordinates = JSON.parse(JSON.stringify(geojson.geometry.coordinates, function (key, val) {
            if (isNaN(+key))
                return val;
            return val.toFixed ? Number(val.toFixed(_this.truncValue)) : val;
        }));
        done(null, geojson);
    };
    return TruncateCoordinates;
}(stream.Transform));
exports.TruncateCoordinates = TruncateCoordinates;
//# sourceMappingURL=truncate-coordinates.js.map