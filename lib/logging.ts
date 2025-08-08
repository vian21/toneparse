export const LoggingFormat = {
    JSON: 0,
    MARKDOWN: 2,
}

export function log_preset(preset: Preset, format = LoggingFormat.MARKDOWN) {
    switch (format) {
        case LoggingFormat.JSON:
            console.log(JSON.stringify(preset, null, 2))
            break
        case LoggingFormat.MARKDOWN:
            if ("modules" in preset) {
                log_md_neural_dsp(preset as NeuralDSPPreset)
            } else if ("audio_units" in preset) {
                log_md_logic_pro(preset as LogicProPreset)
            }
            break
        default:
            throw new Error("Unsupported prest format")
    }
}

function log_md_neural_dsp(preset: NeuralDSPPreset) {
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
    console.log(createCenteredCell(`Plugin Name: ${preset.name}`, tableWidth))

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
            console.log(createRow(k, v ?? "null", maxKeyLength, maxValueLength))
        }
        console.log(divider)
    }
}

function log_md_logic_pro(preset: LogicProPreset) {
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
    const tableWidth = 40
    console.log(
        createCenteredCell(`Logic Pro Preset: ${preset.name}`, tableWidth)
    )

    for (const audio_unit of preset.audio_units) {
        const divider = "-".repeat(tableWidth + 4)
        console.log(divider)

        console.log(
            createCenteredCell(
                `${audio_unit.name})`,
                tableWidth
            )
        )
        console.log(divider)

        const entries = Object.entries(audio_unit.parameters)
        if (entries.length > 0) {
            const maxKeyLength = entries.reduce(
                (max, [k]) => Math.max(max, k.length),
                0
            )
            const maxValueLength = entries.reduce(
                (max, [_, v]) => Math.max(max, String(v).length),
                0
            )

            for (const [k, v] of entries) {
                console.log(
                    createRow(k, String(v), maxKeyLength, maxValueLength)
                )
            }
        } else {
            console.log(createCenteredCell("No parameters found", tableWidth))
        }
        console.log(divider)
    }
}
