# Echo Stack Preset Plugin Decoder Context

This document provides textual context for the "Echo Stack" preset plugin setup, intended to assist an agent in writing the code for a plugin decoder. Below is a detailed list of the plugins included in the preset, along with their parameters, presets (if applicable), mic selections, and cabinet settings, as derived from the provided image attachments.

---

## 1. List of Plugins in the Preset

The "Echo Stack" preset includes the following plugins in its signal chain:

1. **Noise Gate**
2. **Pedalboard**
3. **Amp Designer** (includes amp and cabinet simulation)
4. **Channel EQ**
5. **Compressor**

---

## 2. Parameters for Each Plugin

Below are the detailed parameters for each plugin in the "Echo Stack" preset. Where applicable, the name of the preset loaded, mic selected, and cabinet settings are included.

### Noise Gate

-   **Plugin Name**: Noise Gate
-   **Parameters**:
    -   **Threshold**: -65 dB
    -   **Reduction**: -35 dB
    -   **Attack**: 18 ms
    -   **Hold**: 30 ms
    -   **Release**: 67.1 ms
    -   **Hysteresis**: -3.0 dB
    -   **Lookahead**: 0.0 ms
    -   **Characteristics**: Bandpass
    -   **High Cutoff**: 20000 Hz
    -   **Low Cutoff**: 20 Hz
    -   **Monitor**: Off
    -   **Mode (Gate | Ducker)**: Gate
    -   **Side Chain**: None

### Pedalboard

The "Pedalboard" section includes multiple effects pedals, appearing to be in a chain with splitting and mixing for parallel processing:

-   Most of the values have been given out of 10 or in Percentages

#### The Vibe (Vibrato)

-   **Plugin Name**: The Vibe
-   **Status**: Off
-   **Parameters**:
    -   **Rate**: ~6 (middle position)
    -   **Depth**: ~7 (middle position)
    -   **Type**: V2(11 o'clock)
    -   **Sync**: On

#### Tube Burner (Distortion)

-   **Plugin Name**: Tube Burner
-   **Status**: Off
-   **Parameters**:
    -   **Low**: ~5
    -   **Mid Freq**: ~3
    -   **Mid Gain**: ~5
    -   **High**: ~6
    -   **Bias**: ~2
    -   **Squash**: ~7
    -   **Drive**: ~7
    -   **Tone**: ~8
    -   **Output**: ~4
    -   **Fat Switch**: On

#### Splitter

-   **Plugin Name**: Splitter
-   **Parameters**:
    -   **Frequency**: >500 Hz(1PM, 12PM was 500. 100%=5K, 0%=50)
    -   **Split Freq Range**: 60 Hz to 5 kHz
    -   **Mode** (Split | Freq): Split

#### Tru-Tape Delay

-   **Plugin Name**: Tru-Tape Delay
-   **Status**: On
-   **Parameters**:
    -   **Sync**: On
    -   **Time**: ~4
    -   **Feedback**: 50%
    -   **Mix**: ~48%
    -   **Lo Cut**: ~8
    -   **Hi Cut**: 10
    -   **Dirt**: ~4
    -   **Flutter**: ~3
    -   **NORM/REVERSE switch**: NORM

#### Blue Echo (Delay)

-   **Plugin Name**: Blue Echo
-   **Status**: On
-   **Parameters**:
    -   **Time**: ~6
    -   **Repeats**: 5
    -   **Mix**: ~7.5
    -   **Tone Cut** (Hi | Lo | Off ): Off
    -   **Sync**: Off
    -   **Mute**: Off

#### Mixer

-   **Plugin Name**: Mixer
-   **Parameters**:
    -   **A Pan**: fully to the left
    -   **B Pan**: fully to the Right
    -   **A/B Mix**: Center (60/40)

### Amp Designer

-   **Plugin Name**: Amp Designer
-   **Model**: Vintage British Stack
-   **Amp**: Vintage British Head
-   **Cabinet**: Vintage British 4x12
-   **Mic Selected**: Ribbon 121
-   **Parameters**:
    -   **Gain**: ~2.5
    -   **Bass**: ~6.8
    -   **Mids**: ~5.5
    -   **Treble**: 5
    -   **Reverb**: On
    -   **Reverb Level**: ~2
    -   **Effects**: Off
    -   **Effects Sync/Free**: Sync
    -   **Trem/Vib**: Trem
    -   **Depth**: ~9.1
    -   **Speed**: ~4.5
    -   **Presence**: ~6.5
    -   **Master**: 10
    -   **Output**: ~30% (slider)

### Channel EQ

-   **Plugin Name**: Channel EQ
-   **Preset Loaded**: Echo Stack (dropdown shows Custom)
-   **Parameters**:
    -   **Analyzer**: Post
    -   **Q-Couple**: Enabled
    -   **HQ**: Enabled
    -   **Processing**: Stereo
    -   **Band 1 (High-Pass Filter)**: 81.7 Hz, 12 dB/oct, Q = 0.71
    -   **Band 2**: 164 Hz, -1.5 dB, Q = 1.10
    -   **Band 3**: 200 Hz, 0.0 dB, Q = 0.98
    -   **Band 4**: 360 Hz, 0.0 dB, Q = 0.71
    -   **Band 5**: 1200 Hz, +0.5 dB, Q = 0.71
    -   **Band 6**: 3500 Hz, +1.5 dB, Q = 0.71
    -   **Band 7**: 10000 Hz, 0.0 dB, Q = 0.71
    -   **Band 8 (Low-Pass Filter)**: 17000 Hz, 12 dB/oct, Q = 0.71
    -   **Overall Gain**: 0.0 dB

### Compressor

-   **Plugin Name**: Compressor
-   **Circuit Type**: Vintage VCA
-   **Parameters**:
    -   **Input Gain**: 0 dB
    -   **Threshold**: ~-27 dB
    -   **Ratio**: ~4
    -   **Attack**: ~40 ms
    -   **Release**: ~170 ms
    -   **Make Up**: ~-4 dB
    -   **Auto Gain**: Off
    -   **Limiter**: Off
    -   **Limiter Threshold**: 0 dB
    -   **Distortion**: Soft
    -   **Mix**: 1:1 (12 o'clock)
    -   **Output Gain**: 0 dB
