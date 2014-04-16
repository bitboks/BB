
/**
 * RetinaExport
 * 
 * Illustrator-script to export artwork to png at various sizes.
 * Modify subFolder, resolutions and params to your needs.
 * 
 * Add script to: /Applications/Adobe Illustrator CS6/Presets/en_GB/Scripts or similar.
 * 
 * Written by stian@bitboks.no, 2014
 * 
 */


/**
 * subfolder
 * Folder relative to file where png's will be exported.
 * Set to null to export to same path as ai-file.
 * @type string
 */
var subFolder = null;

/**
 * resolutions
 * List of size (percent) and file-suffix.
 * Script will export resolutions.length files.
 * @type Array
 */
var resolutions = [ 
    { "size": 100, "suffix": "" }, 
    { "size": 200, "suffix": "@2x" },
    { "size": 400, "suffix": "@4x" },
];

/**
 * params
 * Settings for file export.
 * @type Object
 */
var params = {

    // Should the boundary of exported images follow the artboard?
    // If set to false the boundary will follow the smallest enclosing box of the artboard.
    artBoardClipping: true,

    // Export using transparent background?
    transparency: true,
};

/**
 * doc
 * Reference to current open Illustrator-document.
 * @type Object
 */
var doc = app.activeDocument;


// Validate that document exist
if (doc.path !== "") {

    var docParts = {};
    docParts.extension = doc.name.substr(doc.name.lastIndexOf('.') + 1);
    docParts.name = doc.name.substring(0, doc.name.length - (docParts.extension.length + 1));

    var exportPath = doc.path + (subFolder ?  "/" + subFolder : "");
    var exportDirectory = new Folder(exportPath);

    if (!exportDirectory.exists) {
        var newFolder = new Folder(exportPath);
        newFolder.create();
    }

    for (var i in resolutions) {
        var savePath = doc.path;
        var docName = (subFolder ? subFolder + "/" : "") + docParts.name + fileSuffix(resolutions[i].suffix);
        savePath.changePath(docName);
        savePngFile(savePath, resolutions[i].size, params);
    }

    // Beep to tell we're done:
    beep();

} else {
    // Document not saved!
    alert("Error. Save document first.");
}

function fileSuffix(fileAppend) {
    return fileAppend + ".png";
}

// Save PNG file
function savePngFile(filePath, percentScale, params) {
    var options = new ExportOptionsPNG24();
    options.horizontalScale = percentScale;
    options.verticalScale = percentScale;
    options.transparency = params.transparency;
    options.artBoardClipping = params.artBoardClipping;
    doc.exportFile(filePath, ExportType.PNG24, options);
}