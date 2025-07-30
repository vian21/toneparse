export abstract class BaseParser {
    buffer: Buffer
    offset: number
    constructor(buffer: Buffer) {
        this.buffer = buffer
        this.offset = 0
    }

    abstract parse(): Preset

    read_until(code: number) {
        for (
            ;
            this.offset < this.buffer.length &&
            this.buffer[this.offset] != code;
            this.offset++
        ) {}
    }

    skip_nbytes(n: number) {
        this.offset += n
    }
}
