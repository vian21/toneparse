export abstract class BaseParser {
    protected buffer: Buffer
    protected offset: number
    constructor(buffer: Buffer) {
        this.buffer = buffer
        this.offset = 0
    }

    abstract parse(): Preset

    protected read_until(code: number) {
        for (
            ;
            this.offset < this.buffer.length &&
            this.buffer[this.offset] != code;
            this.offset++
        ) {}
    }

    protected skip_nbytes(n: number) {
        this.offset += n
    }

    private print_offset() {
        console.log(this.offset.toString(16), this.buffer.length.toString(16))
    }
}
