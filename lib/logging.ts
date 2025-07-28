export const LoggingFormat = {
    JSON: 0,
    MARKDOWN: 2,
}

export function log_preset(
    preset: NeuralDSPPreset,
    format = LoggingFormat.MARKDOWN
) {
    switch (format) {
        case LoggingFormat.JSON:
            console.log(JSON.stringify(preset, null, 2))
            break
        case LoggingFormat.MARKDOWN:
            log_md(preset)
            break
    }
}

function log_md(preset: NeuralDSPPreset) {
    const createCenteredCell = (text: string, width: number) => {
        const padding = Math.max(width - text.length, 0)
        const leftPad = Math.floor(padding / 2)
        const rightPad = padding - leftPad
        return `| ${" ".repeat(leftPad)}${text}${" ".repeat(rightPad)} |`
    }

    const createRow = (
        left: string,
        right: string | number,
        leftWidth: number,
        rightWidth: number
    ) => {
        const leftCell =
            leftWidth > 0 ? `| ${left.padEnd(leftWidth)} ` : `| ${left} `
        const rightCell =
            rightWidth > 0
                ? `| ${String(right).padEnd(rightWidth)} |`
                : `| ${right} |`
        return leftCell + rightCell
    }

    // Create centered header for preset name
    const tableWidth = 30
    console.log(createCenteredCell(`Preset Name: ${preset.name}`, tableWidth))

    for (const module of preset.modules) {
        const divider = "-".repeat(tableWidth + 4) // +4 for the cell borders
        console.log(divider)

        // Create centered header for module name
        console.log(createCenteredCell(module.name, tableWidth))
        console.log(divider)

        // Find the longest parameter name for column alignment
        const entries = Object.entries(module.settings)
        const maxKeyLength = entries.reduce(
            (max, [k]) => Math.max(max, k.length),
            0
        )
        const maxValueLength = entries.reduce(
            (max, [_, v]) => Math.max(max, String(v).length),
            0
        )

        // Display parameters and values in a balanced table
        for (const [k, v] of entries) {
            console.log(createRow(k, v, maxKeyLength, maxValueLength))
        }
        console.log(divider)
    }
}
