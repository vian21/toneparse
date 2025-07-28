interface Preset {
    name: string
}

interface NeuralDSPPreset extends Preset {
    modules: NeuralDSPModule[]
}

interface NeuralDSPModule {
    name: string
    settings: Record<string, string | null>
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
