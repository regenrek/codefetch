/**
 * TAR format parser for streaming tar archives
 * Used by both GitHub and GitLab tarball implementations
 */

interface TarHeader {
  name: string;
  size: number;
  type: string;
}

/**
 * Simple TAR parser that works with streams
 * Parses TAR format block by block
 */
export class TarStreamParser {
  private buffer = new Uint8Array(0);
  private position = 0;

  /**
   * Parse a TAR stream and yield files
   */
  async *parse(
    stream: ReadableStream<Uint8Array>
  ): AsyncGenerator<{ header: TarHeader; body: Uint8Array }> {
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append to buffer
        const newBuffer = new Uint8Array(this.buffer.length + value.length);
        newBuffer.set(this.buffer);
        newBuffer.set(value, this.buffer.length);
        this.buffer = newBuffer;

        // Process complete blocks
        while (this.buffer.length - this.position >= 512) {
          const header = this.parseHeader(
            this.buffer.slice(this.position, this.position + 512)
          );

          if (!header) {
            // End of archive (null block)
            return;
          }

          this.position += 512;

          // Read file content
          const paddedSize = Math.ceil(header.size / 512) * 512;
          if (this.buffer.length - this.position < paddedSize) {
            // Need more data
            break;
          }

          const body = this.buffer.slice(
            this.position,
            this.position + header.size
          );
          this.position += paddedSize;

          // Only yield regular files
          if (header.type === "0" || header.type === "") {
            yield { header, body };
          }
        }

        // Keep unprocessed data
        if (this.position > 0) {
          this.buffer = this.buffer.slice(this.position);
          this.position = 0;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Parse TAR header (512 bytes)
   */
  private parseHeader(block: Uint8Array): TarHeader | null {
    // Check for null block (end of archive)
    if (block.every((b) => b === 0)) {
      return null;
    }

    // Extract fields (all are null-terminated strings)
    const name = this.extractString(block, 0, 100);
    const size = Number.parseInt(this.extractString(block, 124, 12), 8) || 0;
    const type = this.extractString(block, 156, 1);

    return { name, size, type };
  }

  /**
   * Extract null-terminated string from buffer
   */
  private extractString(
    buffer: Uint8Array,
    offset: number,
    length: number
  ): string {
    const slice = buffer.slice(offset, offset + length);
    const nullIndex = slice.indexOf(0);
    const trimmed = nullIndex === -1 ? slice : slice.slice(0, nullIndex);
    return new TextDecoder().decode(trimmed).trim();
  }
}
