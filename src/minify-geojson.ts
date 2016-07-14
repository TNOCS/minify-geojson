import fs = require('fs');
import path = require('path');

const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage')

const optionDefinitions = [
    { name: 'keys', alias: 'k', type: Boolean, typeLabel: '[underline]{Boolean}', description: 'Minify property keys.' },
    { name: 'coordinates', alias: 'c', type: Number, defaultOption: false, typeLabel: '[underline]{Positive number}', description: 'Only keey the first [italic]{n} digits of each coordinate.' },
    { name: 'src', alias: 's', type: String, multiple: true, defaultOption: true, typeLabel: '[underline]{File names}', description: 'Source files to process.' }
];


const sections = [
    {
        header: 'Minify GeoJSON',
        content: 'For each input file, minify the property keys and the number of decimals for each coordinate.'
    },
    {
        header: 'Options',
        optionList: optionDefinitions
    }
];

const options = commandLineArgs(optionDefinitions);
// console.log(options);

// Re-use the keys acrross files.
var keys: { [key: string]: string } = {};
let lastKey = 1;

if (!options.src) {
    const usage = getUsage(sections);
    console.log(usage);
} else {
    options.src.forEach(s => {
        let file = path.isAbsolute(s) ? s : path.join(__dirname, s);
        if (fs.existsSync(file)) minifyGeojson(file, options.keys, options.coordinates, () => {});
    });
}

function minifyGeojson(inputFile: string, minifyKeys: boolean, minifyCoordinates: number, done: Function) {
    if (!minifyKeys && !minifyCoordinates) return;
    let outputFile = inputFile.replace(/\.[^/.]+$/, ".min.geojson");
    let geojson: GeoJSON.FeatureCollection<GeoJSON.GeometryObject>;
    fs.readFile(inputFile, 'utf8', (err, data) => {
        if (err) throw err;
        geojson = JSON.parse(data);
        if (minifyKeys) {
            geojson.features.forEach(f => {
                if (f.properties) {
                    let props: {[key: string]: any} = {};
                    for (var key in f.properties) {
                        let replace: string;
                        if (keys.hasOwnProperty(key)) {
                            replace = keys[key];
                        } else {
                            replace = convertToNumberingScheme(lastKey++);
                            keys[key] = replace;
                        }
                        props[replace] = f.properties[key];
                    }
                    f.properties = props;
                }
            });
        }
        let minified: string;
        if (typeof minifyCoordinates === 'number' && minifyCoordinates > 0) {
            minified = JSON.stringify(geojson, (key, val) => {
                if (isNaN(+key)) return val;
                return val.toFixed ? Number(val.toFixed(minifyCoordinates)) : val;
            });
        } else {
            minified = JSON.stringify(geojson);
        }
        fs.writeFile(outputFile, minified, (err) => {
            if (err) throw err;
            let inputStats = fs.statSync(inputFile);
            let inputFileSizeInBytes = inputStats["size"];
            let outputStats = fs.statSync(outputFile);
            let outputFileSizeInBytes = outputStats["size"];
            let percentage = 100 * (inputFileSizeInBytes - outputFileSizeInBytes) / inputFileSizeInBytes;
            console.log(`${inputFile} minified successfully!`);
            console.log('Key mapping:');
            console.log(JSON.stringify(keys, null, 2));
            console.log(`Original size: ${inputFileSizeInBytes.toLocaleString('en-US', {minimumFractionDigits: 0})}`);
            console.log(`New size:      ${outputFileSizeInBytes.toLocaleString('en-US', {minimumFractionDigits: 0})}`);
            console.log(`Reduction:     ${percentage.toLocaleString('en-US', {minimumFractionDigits: 2})}%`);
            done();
        });
    });
}

function convertToNumberingScheme(number) {
    var baseChar = ("a").charCodeAt(0),
        letters = "";

    do {
        number -= 1;
        letters = String.fromCharCode(baseChar + (number % 26)) + letters;
        number = (number / 26) >> 0;
    } while (number > 0);

    return letters;
}
