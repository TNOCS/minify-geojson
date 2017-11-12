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
var Stringifier = (function (_super) {
    __extends(Stringifier, _super);
    function Stringifier() {
        return _super.call(this, { objectMode: true }) || this;
    }
    Stringifier.prototype._transform = function (geojson, encoding, done) {
        this.push(JSON.stringify(geojson));
        done();
    };
    return Stringifier;
}(stream.Transform));
exports.Stringifier = Stringifier;
//# sourceMappingURL=stringifier.js.map