interface Preset {
    name: string
}

interface NeuralDSPPreset extends Preset {
    modules: {
        name: string
        settings: Record<string, string>
    }
}

interface Amp {
    name: string
    settings: {
        name: string
        value: number
    }
}

interface Pedal {
    name: string
    settings: {
        name: string
        value: number
    }
}
