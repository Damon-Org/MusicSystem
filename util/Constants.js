import EqBand from '../structures/equalizer/Band.js'

export const DJMode = {
    FREEFORALL: 1,
    MANAGED: 2,
    ROLE: 3
};

/**
 * Frequency / Band
 *
 * 0 => 25Hz
 * 1 => 40Hz
 * 2 => 63Hz
 * 3 => 100Hz
 * 4 => 160Hz
 * 5 => 250Hz
 * 6 => 400Hz
 * 7 => 630Hz
 * 8 => 1kHz
 * 9 => 1.6kHz
 * 10 => 2.5kHz
 * 11 => 4kHz
 * 12 => 6.3kHz
 * 13 => 10kHz
 * 14 => 16kHz
 */
export const EqualizerBands = {
    bass: [
        EqBand(0, 0.15),
        EqBand(1, 0.14),
        EqBand(2, 0.11),
        EqBand(3, 0.05),
        EqBand(4, 0.02),
        EqBand(5, 0),
        EqBand(6, 0),
        EqBand(7, 0),
        EqBand(8, 0),
        EqBand(9, 0),
        EqBand(10, 0),
        EqBand(11, 0),
        EqBand(12, 0),
        EqBand(13, 0),
        EqBand(14, 0)
    ],
    xbass: [
        EqBand(0, 0.28),
        EqBand(1, 0.22),
        EqBand(2, 0.15),
        EqBand(3, 0),
        EqBand(4, 0),
        EqBand(5, 0),
        EqBand(6, 0),
        EqBand(7, 0),
        EqBand(8, 0),
        EqBand(9, 0),
        EqBand(10, 0),
        EqBand(11, 0),
        EqBand(12, 0),
        EqBand(13, 0),
        EqBand(14, 0)
    ],
    deep: [
        EqBand(0, 0.13),
        EqBand(1, 0.125),
        EqBand(2, 0.1),
        EqBand(3, 0.04),
        EqBand(4, 0),
        EqBand(5, 0),
        EqBand(6, 0),
        EqBand(7, 0),
        EqBand(8, 0),
        EqBand(9, 0.08),
        EqBand(10, 0.06),
        EqBand(11, -0.05),
        EqBand(12, -0.06),
        EqBand(13, -0.06),
        EqBand(14, -0.06)
    ],
    get flat() { return this.normal },
    normal: (() => {
        let eqBands = [];
        for (let i = 0; i < 15; i++) eqBands.push(EqBand(i,0));
        return eqBands;
    })(),
    'r&b': [
        EqBand(0, 0.11),
        EqBand(1, 0.11),
        EqBand(2, 0.09),
        EqBand(3, 0.05),
        EqBand(4, 0.02),
        EqBand(5, 0),
        EqBand(6, 0),
        EqBand(7, 0),
        EqBand(8, 0),
        EqBand(9, 0),
        EqBand(10, -0.01),
        EqBand(11, -0.04),
        EqBand(12, 0.02),
        EqBand(13, 0.06),
        EqBand(14, 0.08)
    ],
    rock: [
        EqBand(0, 0.11),
        EqBand(1, 0.11),
        EqBand(2, 0.095),
        EqBand(3, 0.04),
        EqBand(4, 0.01),
        EqBand(5, 0),
        EqBand(6, 0),
        EqBand(7, 0),
        EqBand(8, 0),
        EqBand(9, 0),
        EqBand(10, 0),
        EqBand(11, -0.01),
        EqBand(12, 0.075),
        EqBand(13, 0.135),
        EqBand(14, 0.165)
    ],
    treble: [
        EqBand(0, 0),
        EqBand(1, 0),
        EqBand(2, 0),
        EqBand(3, 0),
        EqBand(4, 0),
        EqBand(5, 0),
        EqBand(6, 0),
        EqBand(7, 0),
        EqBand(8, 0),
        EqBand(9, 0),
        EqBand(10, 0),
        EqBand(11, 0.05),
        EqBand(12, 0.13),
        EqBand(13, 0.20),
        EqBand(14, 0.25)
    ],
    vocal: [
        EqBand(0, -0.05),
        EqBand(1, -0.05),
        EqBand(2, -0.03),
        EqBand(3, 0),
        EqBand(4, 0),
        EqBand(5, 0),
        EqBand(6, 0),
        EqBand(7, 0),
        EqBand(8, 0),
        EqBand(9, 0.03),
        EqBand(10, 0.13),
        EqBand(11, 0.29),
        EqBand(12, 0.18),
        EqBand(13, 0.07),
        EqBand(14, -0.04)
    ]
};
