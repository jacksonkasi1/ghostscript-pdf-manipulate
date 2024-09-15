// background.js

function loadScript() {
  import("./gs.js");
}

let Module;

/**
 * Processes a PDF based on the selected operation.
 *
 * @param {string} operation - The operation to perform: 'compress', 'grayscale', or 'cmyk'.
 * @param {Object} dataStruct - Contains the PDF data URL.
 * @param {Function} responseCallback - Called with the response containing the processed PDF URL.
 * @param {Function} progressCallback - Called to report progress.
 * @param {Function} statusUpdateCallback - Called to report status updates.
 */
export function _processPDF(
  operation,
  dataStruct,
  responseCallback,
  progressCallback,
  statusUpdateCallback
) {
  // Define Ghostscript arguments for each operation
  const ghostscriptArgs = {
    compress: [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dPDFSETTINGS=/ebook", // Adjust compression level as needed
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-sOutputFile=output_compressed.pdf",
      "input.pdf",
    ],
    grayscale: [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-sColorConversionStrategy=Gray",
      "-dProcessColorModel=/DeviceGray",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-sOutputFile=output_grayscale.pdf",
      "input.pdf",
    ],
    cmyk: [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-sColorConversionStrategy=CMYK",
      "-dProcessColorModel=/DeviceCMYK",
      "-dOverrideICC",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-sOutputFile=output_cmyk.pdf",
      "input.pdf",
    ],
  };

  // Validate operation
  if (!ghostscriptArgs[operation]) {
    throw new Error("Invalid PDF processing operation.");
  }

  // First, download the PDF data
  const xhr = new XMLHttpRequest();
  xhr.open("GET", dataStruct.pdfDataURL);
  xhr.responseType = "arraybuffer";
  xhr.onload = function () {
    // Release the URL
    window.URL.revokeObjectURL(dataStruct.pdfDataURL);
    // Set up EMScripten environment
    Module = {
      preRun: [
        function () {
          const FS = window.FS;
          FS.writeFile("input.pdf", new Uint8Array(xhr.response));
        },
      ],
      postRun: [
        function () {
          const FS = window.FS;
          const outputFileName = ghostscriptArgs[operation].find(arg => arg.startsWith("-sOutputFile=")).split("=")[1];
          const uarray = FS.readFile(outputFileName, { encoding: "binary" }); // Uint8Array
          const blob = new Blob([uarray], { type: "application/octet-stream" });
          const pdfDataURL = window.URL.createObjectURL(blob);
          responseCallback({ pdfDataURL: pdfDataURL, url: dataStruct.url });
        },
      ],
      arguments: ghostscriptArgs[operation],
      print: function (text) {
        statusUpdateCallback(text);
      },
      printErr: function (text) {
        statusUpdateCallback("Error: " + text);
        console.error(text);
      },
      setStatus: function (text) {
        if (!Module.setStatus.last)
          Module.setStatus.last = { time: Date.now(), text: "" };
        if (text === Module.setStatus.last.text) return;
        const m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
        const now = Date.now();
        if (m && now - Module.setStatus.last.time < 30)
          // If this is a progress update, skip it if too soon
          return;
        Module.setStatus.last.time = now;
        Module.setStatus.last.text = text;
        if (m) {
          text = m[1];
          progressCallback(false, parseInt(m[2]) * 100, parseInt(m[4]) * 100);
        } else {
          progressCallback(true, 0, 0);
        }
        statusUpdateCallback(text);
      },
      totalDependencies: 0,
    };
    Module.setStatus("Loading Ghostscript...");
    window.Module = Module;
    loadScript();
  };
  xhr.send();
}
