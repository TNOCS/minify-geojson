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
var TruncatePropertyValues = (function (_super) {
    __extends(TruncatePropertyValues, _super);
    function TruncatePropertyValues(truncValue) {
        var _this = _super.call(this, { objectMode: true }) || this;
        _this.truncValue = truncValue;
        return _this;
    }
    TruncatePropertyValues.prototype._transform = function (geojson, encoding, done) {
        for (var key in geojson.properties) {
            if (!geojson.properties.hasOwnProperty(key) || isNaN(geojson.properties[key])) {
                continue;
            }
            geojson.properties[key] = (+geojson.properties[key]).toFixed(this.truncValue);
        }
        done(null, geojson);
    };
    return TruncatePropertyValues;
}(stream.Transform));
exports.TruncatePropertyValues = TruncatePropertyValues;
//# sourceMappingURL=truncate-property-values.js.map