// fileChunkHandler.js

/**
 * Splits a file into chunks and processes each chunk.
 * @param {File} file - The file to be chunked.
 * @param {number} chunkSize - The size of each chunk in bytes.
 * @param {function} onChunk - Callback for processing each chunk.
 */
function handleFileChunks(file, chunkSize, onChunk) {
  const fileSize = file.size;
  let offset = 0;

  while (offset < fileSize) {
    const chunk = file.slice(offset, offset + chunkSize);
    onChunk(chunk);
    offset += chunkSize;
  }
}

// Example usage:
// Assuming `fileInput` is an <input type="file" />
document.querySelector("#fileInput").addEventListener("change", (event) => {
  const file = event.target.files[0]; // Get the selected file
  const chunkSize = 1024 * 1024; // 1MB

  handleFileChunks(file, chunkSize, (chunk) => {
    console.log("Processing chunk:", chunk);
    // Example: Upload chunk to a server
    // uploadChunk(chunk);
  });
});
