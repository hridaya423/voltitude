import { makeSong, sectionBase } from "@rl/js/music/song.js";
import { Rng } from "@rl/js/music/theory.js";
import { leadTonic } from "@rl/js/music/motif.js";
export const TRACKS = [
{
id: 'halogen-hymn', dropLufs: -13.1, title: 'Halogen Hymn', artist: 'The Ninth Pylon', bpm: 124, keyPc: 6, scale: 'aeolian', form: 'classic',
feel: 'four', harmonicRhythm: '1 (intro / breakdown 2)', seed: 0x1a106e11, role: 'main title: the full theme statement',
sections: [['intro', 8], ['groove', 16], ['build', 8], ['drop', 16, 'A'], ['breakdown', 16], ['build', 8], ['drop', 32, 'B', { final: true, liftBy: 2 }], ['outro', 8, 'picardy']],
prog: {
intro: 'i i bVI bVI iv iv V V', groove: 'i bVI III bVII iv iv IV V', groove2: 'i IV iv V i iv bII V',
drop: 'i i III bVII iv bVI bII V', drop2: 'i i iv V i iv bII V', dropB: 'i bVI iv V bVI bVI bII V',
breakdown: 'bVI7 bVI7 iv7 iv7 i9 i9 bII bII bVI7 bVI7 iv7 iv7 i9 i9 bvi! bvi!',
build: 'iv iv bVI bVI bVII bVII bII V', lift: 'bII V', pedal: 'i i bVII i', end: 'V i',
outro: 'i bVI iv V i V V V', replay: 'i bVI III bVII',
menu: ['i i bVI bVI III III bVII bVII', 'bVI7 bVI7 iv7 iv7 i9 i9 V V', 'i i IV IV bVI bVI bVII bVII'],
},
bass: { main: 'R..r..O.R..r.tsb', main2: 'R..r..O.R..r.Oor', high: 'R.rrO.rrR.rrOtsb', low: 'R-----r-..R-..o-' },
arp: { base: 64, mask: '1101101101101101', order: [0, 2, 1, 3, 2, 4, 3, 5] },
hats: '9373937393739373', ghosts: [7, 14], kickExtra: [14], kit: { snare: 0, hat: 0, backbeat: 'gated' },
fills: { toms: [0, 4, 7], stop: '........s.s.Sh.L' },
patch: {}, leadThird: 'duo', leadTimbre: 'super', leadAlt: 'pwm', bassTimbre: 'roll', kickVar: 0.25, leadMax: 92, air: -5, bdCarrier: 'choir', bdEnd: 'iv V', leadTrim: 0.5,
swing: 0.52, kickTrim: 1, perc: { kind: 'machine' }, grooveDb: 0.7, dropGameDb: 0.5,
theme: { answer: [3, 2, 4, 3, 2, 1, 0, 1], answerCell: 6, high: 7, leap: 0, devCell: 20, dev: [6, 4, 6, 5, 4, 2], cad: [3, 2, 2, 1, 0, 1, 0], cadCell: 18,
cadFinal: { prog: 'bVI bVII i', notes: [[96, 4, 3], [100, 4, 2], [104, 4, 1], [108, 4, -1], [112, 16, 0]] } },
themeA2: { cad: [2, 3, 2, 3, 2, 1], cadCell: 16 },
themeB: { head: [[0, 8, 7], [8, 2, 6], [10, 2, 4], [12, 4, 2], [16, 2, 3], [18, 2, 2], [20, 4, 1], [24, 4, 0], [28, 4, 1]],
answer: [-1, -3, -2, -1, 1, 1, 0, 1], answerCell: 9, high: 5, leap: 0, devCell: 23, dev: [3, 2, 4, 0], cad: [2, 3, 2, 1, 2, 3, 4], cadCell: 18 },
themeB2: { cad: [3, 2, 1, -1, -1, 0], cadCell: 17 },
verse: { cell: [[0, 6], [6, 8], [16, 8]], degs: [[0, -1, -3], [-2, 0, 2], [1, 2, 4], [3, 1, 0]] },
gainDb: 0.7, introDb: 1, sub40: true, preFinalDb: 1, riser: { int: 7, span: 12 }, cover: { hue: 0, shape: 'halo' }, accent: '#ff2a3c',
},
{
id: 'vertical-hang', dropLufs: -12.9, title: 'Vertical Hang', artist: 'Undertow Array', bpm: 128, keyPc: 9, scale: 'phrygian', form: 'coldOpen',
feel: 'four', harmonicRhythm: '2+1+1', seed: 0x7e47ca11, role: 'the J-ramp: cold open, Phrygian ♭II',
sections: [['build', 4, 'coldOpen'], ['drop', 16, 'A'], ['groove', 16], ['breakdown', 16], ['build', 8], ['drop', 32, 'B'], ['outro', 8]],
prog: {
intro: 'i i bII bVII', groove: 'i i bII bVII iv iv bII bII', groove2: 'i i bII iv',
drop: 'i i bII bVII bII i iv i', drop2: 'i bVI bII i bII i iv i', dropB: 'i i iv bII',
breakdown: 'bVI bVI bII bII iv iv bII bII',
build: 'bII bII bVII bVII bII bII bII bII', pedal: 'i bII bVII i', end: 'bII i',
outro: 'i bII bVII i', replay: 'i bII bVII i',
menu: ['i i bII bII bVII bVII i i', 'iv iv bII bII i i bVII bVII', 'i i bVI bVI bII bII bVII bVII'],
},
bass: { main: 'R.r.R.s.R.r.R.sr', main2: 'R.s.R.r.O.s.R.b.', high: 'RrsrRrsrRrsrOrsr', low: 'R-------r-----s-' },
arp: { base: 64, mask: '1011101110111011', order: [0, 1, 2, 3, 4, 5] },
hats: '9474947494749474', ghosts: [3, 11], kickExtra: [10], kit: { snare: 2, hat: 1, backbeat: 'clap' },
fills: { toms: [1, 3, 8], stop: '........S.s.S.ss' },
patch: { arp: 'square', arpQ: 8, arpDecay: 0.8, padDetune: 14, chorusHz: 0.3, padLP: 750, kickBody: 0.075, kickDrop: 0.028 },
buildPedal: 'none', leadThird: 'bellsaw', leadTimbre: 'pwm', leadAlt: 'super', bassTimbre: 'pulse', kickVar: 0.3, leadMax: 89, air: 7, lowShelf: 5, lowShelfHz: 60, sub2: 0.6, body: 5, padLow: 1.5, kickTrim: 3.5,
spic: { pat: 'R..r..R.R..r..of', acc: '1001001010010010' }, grooveDb: 0.8, dropGameDb: 0.5, finalDb: -0.5,
kickTail: 47, width: 0.75, bdCarrier: 'bell', bdEnd: 'bVI bVII',
theme: { head: [[0, 2, 1], [2, 2, 0], [4, 4, 1], [10, 6, 0], [16, 2, 2], [18, 2, 1], [20, 4, 0], [26, 6, -1]],
answer: [3, 2, 1, 1, 2, 0, -1], answerCell: 11, high: 5, leap: 0, devCell: 21, dev: [3, 2, 3, 2, 0, -1], cad: [-3, -2, -1, 0], cadCell: 15,
cadFinal: { prog: 'bVI bVII i', notes: [[96, 6, 3], [102, 2, 2], [104, 8, 1], [112, 16, 0]] } },
themeA2: { cad: [-1, 0, 2, 1], cadCell: 14 },
themeB: { head: [[0, 2, 2], [2, 2, 1], [4, 4, 2], [10, 6, 0], [16, 2, -1], [18, 2, 0], [20, 4, -1], [26, 6, -3]],
answer: [[32, 6, -2], [38, 2, -1], [40, 8, 0], [48, 4, 1], [52, 4, 0], [56, 8, -1], [64, 6, 0], [70, 2, 1], [72, 4, 2], [76, 4, 1],
[80, 6, 2], [86, 2, 3], [88, 4, 2], [92, 4, 0, 'l']],
high: 5, leap: 0, dev: [[96, 8, 5], [104, 4, 4], [108, 4, 3]], cad: [[112, 4, 3], [116, 4, 2], [120, 8, 1]] },
themeB2: { cad: [[112, 8, 2], [120, 8, 1]] },
verse: { cell: [[0, 4], [4, 6], [16, 4], [20, 6]], degs: [[0, 1, 0, -2], [-3, -1, 0, 1], [1, 2, 4, 3], [3, 2, 1, 0]] },
lowMid450: 4, kickPre: 0.065,
gainDb: -1.1, sub40: true, introDb: -1.5, riser: { int: 1, span: 12, pitched: 0.45 }, cover: { hue: 1, shape: 'jcurve' }, accent: '#5cc8ff',
bassDuck: 1.35,
},
{
id: 'tarmac-leviathan', dropLufs: -12.9, title: 'Tarmac Leviathan', artist: 'Nullgarden', bpm: 98, keyPc: 2, scale: 'aeolian', form: 'halftime',
feel: 'half', harmonicRhythm: '2 (verse) / 2 (drops)', seed: 0x7a5a1e91, role: 'half-time reese',
sections: [['intro', 8], ['halftime', 16], ['build', 4], ['drop', 16, 'A'], ['breakdown', 8], ['build', 4], ['drop', 16, 'B'], ['outro', 8]],
prog: {
intro: 'i i iv iv bVI bVI V V', halftime: 'i i bVI bVI iv iv V V', groove: 'i i bVI bVI iv iv V V', groove2: 'i i bVI bVI bII bII V V',
drop: 'i i bVI bVI iv iv bVI V', drop2: 'i i iv iv bII bII bVI V', dropB: 'i bII bVI V',
breakdown: 'iv iv bVI bVI bII bII V V',
build: 'bVI bVI bII bII', pedal: 'i bVII bVI bVII', end: 'V i',
outro: 'i i iv iv bII bII V V', replay: 'i bVI iv V',
menu: ['i i bVI bVI iv iv V V', 'bVI bVI III III bVII bVII i i', 'i i bII bII bVI bVI V V'],
},
bass: { half: 'R-------..r-o-b-', main: 'R-----r-..R-b-s-', high: 'R---r-O-..R-b-s-', low: 'R---------------' },
arp: { base: 63, mask: '1001001010010010', order: [5, 3, 4, 2, 3, 1] },
hats: '9363936393639363', ghosts: [3, 14], kickExtra: [7], kit: { snare: 1, hat: 2, backbeat: 'layered' },
fills: { toms: [2, 5, 6], stop: '........S...l.LL' },
patch: { arp: 'sawoct', arpQ: 5, arpDecay: 1.3, padDetune: 16, chorusHz: 0.17, padLP: 560, kickBody: 0.1, kickDrop: 0.04 },
buildPedal: 'tonic', leadThird: 'super', leadTimbre: 'duo', leadAlt: 'bellsaw', bassTimbre: 'reese', breakReese: true, air: -0.5, sub: { lo: 25, db: 1.5 }, hook: 'reeseHead', body: 8.5, top: -0.5, leadTrim: 0.5,
reeseLead: true, perc: { kind: 'taiko' }, grooveDb: -0.6, finalDb: -0.5,
kickTail: 46.5, kickTrim: 1.5, width: 0.75, bdCarrier: 'bell',
theme: { head: [[0, 6, 0], [6, 2, -2], [8, 8, -3], [16, 4, 0], [20, 2, 2], [22, 2, 1], [24, 8, 0]],
answer: [[32, 4, 2], [36, 2, 3], [38, 2, 3], [40, 4, 1], [44, 4, 0], [48, 6, -2], [54, 2, -3], [56, 4, -2], [60, 4, -1],
[64, 6, 3], [70, 2, 2], [72, 4, 3], [76, 4, 4], [80, 6, 5], [86, 2, 5], [88, 4, 4], [92, 4, 6]],
high: 7, leap: 0, dev: [[96, 4, 2], [100, 4, 0, 'l'], [104, 8, 7]], cad: [[112, 4, 6], [116, 2, 4], [118, 2, 3], [120, 8, 2]],
cadFinal: { prog: 'iv V i', notes: [[96, 6, 4], [102, 2, 3], [104, 8, -1], [112, 16, 0]] } },
themeA2: { cad: [[112, 6, 4], [118, 2, 3], [120, 4, 1], [124, 4, 0]] },
themeB: { head: [[0, 6, 2], [6, 2, 1], [8, 8, -1], [16, 4, 3], [20, 2, 5], [22, 2, 4], [24, 8, 3]],
answer: [[32, 6, 0], [38, 2, -1], [40, 8, -2], [48, 6, -3], [54, 2, -2], [56, 8, -1], [64, 6, 0], [70, 2, 1], [72, 4, 2], [76, 4, 0], [80, 6, 3], [86, 2, 2], [88, 4, 1], [92, 4, 0, 'l']],
high: 7, leap: 0, dev: [[96, 8, 7], [104, 4, 5], [108, 4, 4]], cad: [[112, 4, 6], [116, 4, 4], [120, 8, 1]] },
themeB2: { cad: [[112, 8, 6], [120, 8, 4]] },
verse: { cell: [[0, 6], [8, 8], [20, 6]], degs: [[0, -2, -3], [-1, 0, 2], [1, 3, 4], [2, 1, 0]] },
outroDb: -1.2, gainDb: -0.2, introDb: -1, sub40: true, riser: { int: 7, span: 7, f0: 160, f1: 4000, pitched: 0.25 }, cover: { hue: 2, shape: 'wave' }, accent: '#ffb000',
},
{
id: 'crosswind-coronation', dropLufs: -12.9, title: 'Crosswind Coronation', artist: 'Hexa Lumen', bpm: 132, keyPc: 4, scale: 'dorian', form: 'doubleDrop',
feel: 'four', harmonicRhythm: '1', seed: 0xc02011a7, role: 'Dorian anthem, double drop',
sections: [['intro', 8], ['groove', 16], ['build', 8], ['drop', 16, 'A'], ['build', 2, 'lift2'], ['drop', 16, 'B'], ['breakdown', 16], ['build', 4], ['drop', 16, 'A', { final: true, liftBy: 2 }], ['outro', 8]],
prog: {
intro: 'i i IV IV', groove: 'i IV bVI bVII', groove2: 'i IV IV bVII',
drop: 'i i IV IV IV bVII ii IV', drop2: 'i i IV IV IV ii bVII V', dropB: 'i IV bVII IV',
breakdown: 'IV IV bVI bVI bVII bVII i i',
build: 'IV IV bVII bVII ii ii V V', lift: 'IV V', pedal: 'i IV i IV', end: 'IV i',
outro: 'i IV i IV ii bVII IV IV', replay: 'i IV bVII IV',
menu: ['i i IV IV bVI bVI bVII bVII', 'IV IV i i bVII bVII V V', 'i i ii ii IV IV bVII bVII'],
},
bass: { main: 'R.O.r.O.R.O.t.s.', main2: 'R.O.r.O.R.Ofo.s.', high: 'RrOrRrOrRrOrtrsr', low: 'R---R---r---o---' },
arp: { base: 66, mask: '1111111111111111', order: [0, 1, 2, 3, 4, 3, 2, 1] },
hats: '9575957595759575', ghosts: [7, 15], kickExtra: [14], kit: { snare: 0, hat: 0, backbeat: 'gated' },
fills: { toms: [0, 2, 8], stop: '........s.S.s.SS' },
patch: { arp: 'sawsq', arpQ: 6, arpDecay: 0.9, padDetune: 10, chorusHz: 0.25, padLP: 820, kickBody: 0.072, kickDrop: 0.026 },
leadThird: 'bellsaw', leadTimbre: 'super', leadAlt: 'pwm', bassTimbre: 'roll', kickVar: 0.2, leadPhrases: { final: [1, 1, 0, 1] }, air: -4.5, leadMax: 90, sub2: 0.7, presence: -0.5, top: -1, width: 0.35, leadTrim: 1.8,
swing: 0.5, kickTrim: 1, perc: { kind: 'ride' },
bdCarrier: 'bell', bdEnd: 'bVI bVII',
theme: { head: [[0, 2, 0], [2, 2, 1], [4, 4, 2], [8, 8, 5], [16, 6, 4], [22, 2, 3], [24, 4, 2], [28, 4, 0]],
answer: [3, 2, 1, 1, 0, -1, 0, -3], answerCell: 4, high: 7, leap: 0, devCell: 20, dev: [4, 2, 0, 3, 4, 5], cad: [3, 1, 3, 4], cadCell: 14,
cadFinal: { prog: 'IV V i', notes: [[96, 6, 1], [102, 2, 3], [104, 8, 1], [112, 16, 0]] } },
themeA2: { cad: [3, 2, 1, 4], cadCell: 15 },
themeB: { head: [[0, 2, 5], [2, 2, 4], [4, 4, 3], [8, 8, 0], [16, 6, 1], [22, 2, 2], [24, 4, 3], [28, 4, 4]],
answer: [1, 3, 3, 1, 0, 0, 1, 0], answerCell: 10, high: 7, leap: 0, devCell: 20, dev: [6, 4, 2, 3, 4, 5], cad: [4, 3, 1, -1, 0], cadCell: 19 },
themeB2: { cad: [3, 2, 1, 2, 3, 1, 0], cadCell: 18 },
verse: { cell: [[0, 4], [4, 8], [16, 6]], degs: [[0, 2, -1], [-3, 0, 1], [2, 3, 4], [2, 1, 0]] },
introDb: 1.7, gainDb: 1.0, sub40: true, riser: { int: 4, span: 12, f1: 9500, pitched: 0.4 }, cover: { hue: 3, shape: 'twin' }, accent: '#7cf2c2',
},
{
id: 'afterglow-telemetry', dropLufs: -12.7, title: 'Afterglow Telemetry', artist: 'Lantern Static', bpm: 110, keyPc: 11, scale: 'aeolian', form: 'ballad',
feel: 'broken', harmonicRhythm: '2', seed: 0xaf7e2910, role: 'sparse ballad',
sections: [['intro', 8], ['breakdown', 16], ['groove', 16], ['build', 4], ['drop', 16, 'A'], ['breakdown', 16], ['outro', 8]],
prog: {
intro: 'i i iv iv bVI bVI V V', groove: 'i i iv iv bVI bVI V V', groove2: 'i i bVI bVI IV IV V V',
drop: 'i bVII III III bVI bVI iv V', drop2: 'i bVII iv iv bVI bVI IV V',
breakdown: 'i i iv iv bVI bVI V V i i bvi! bvi! iv iv V V',
build: 'III III bVI bVI iv iv V V', pedal: 'i III bVII bVI', end: 'iv i',
outro: 'i i iv iv bVI bVI V V', replay: 'i bVI III bVII',
menu: ['i i bVI bVI III III bVII bVII', 'i i bvi! bvi! bVI bVI bVII bVII', 'iv iv i i bVI bVI V V'],
},
bass: { main: 'R-----r-..R---o-', main2: 'R-----r-..R-t-s-', high: 'R---r-r-..R-t-sb', low: 'R---------------' },
arp: { base: 66, mask: '1010101110101011', order: [0, 2, 4, 1, 3, 5] },
hats: '9363936393639363', kickExtra: [11], kit: { snare: 1, hat: 2, backbeat: 'snare' },
fills: { toms: [5, 7, 2], stop: '........S...h.m.' },
patch: { arp: 'sawoct', arpQ: 4.5, arpDecay: 1.4, padDetune: 9, chorusHz: 0.16, padLP: 600, kickBody: 0.095, kickDrop: 0.035 },
leadThird: 'pwm', leadTimbre: 'vox', leadAlt: 'duo', bassTimbre: 'pulse', leadOct: -12, leadMax: 83, leadRel: 0.12, air: 1, lowShelf: 3.5, lowShelfHz: 70, presence: 2.5, top: -2.5, body: 6, padLow: 3.5,
kickTrim: 6, kickPre: 0.065, leadTrim: 1.0,
width: 0.75, bdCarrier: 'choir', bdEnd: 'iv V',
swing: 0.57, ghosts: [2, 7, 10, 13, 15], keys: true, padLeadDb: 7, choirLeadDip: { f: 2500, q: 1.2, db: 3 }, grooveDb: -1.8,
dropGameDb: -0.4,
theme: { head: [[0, 10, 4], [10, 6, 2], [16, 6, 3], [22, 2, 2], [24, 8, 1]],
answer: [[32, 4, 0], [36, 4, 2], [40, 8, 4], [48, 4, 3], [52, 4, 2], [56, 2, 1], [58, 2, 1], [60, 4, 0], [64, 6, 2], [70, 2, 3], [72, 4, 4], [76, 4, 0, 'l']],
high: 7, leap: 0, dev: [[80, 8, 7], [88, 4, 6], [92, 4, 4]], cad: [[96, 6, 3], [102, 2, 2], [104, 8, 1], [112, 4, 2], [116, 12, 0]],
cadFinal: { prog: 'bVI bVII i', notes: [[96, 6, 1], [102, 2, 3], [104, 8, 1], [112, 16, 0]] } },
themeA2: { cad: [[96, 6, 3], [102, 2, 4], [104, 8, 2], [112, 8, 1], [120, 8, 0]] },
themeB: { head: [[0, 5, 2], [5, 3, 1], [8, 8, 2], [16, 10, 3], [26, 6, 1, 'l']],
high: 6, leap: 1, dev: [[32, 10, 6], [42, 2, 4], [44, 4, 3]],
answer: [[48, 6, 2], [54, 2, 1], [56, 8, 0], [64, 6, -1], [70, 2, 0], [72, 8, -3], [80, 6, -1], [86, 2, 0], [88, 8, 1]],
cad: [[96, 6, 2], [102, 2, 1], [104, 8, 0], [112, 6, -1], [118, 2, -2], [120, 8, -3]] },
themeB2: { cad: [[96, 6, 2], [102, 2, 1], [104, 8, 0], [112, 4, 1], [116, 4, -1], [120, 8, 0]] },
verse: { cell: [[0, 8], [10, 4], [16, 8]], degs: [[2, 0, -1], [-3, -2, 0], [1, 3, 4], [2, 1, 0]] },
outroDb: -1, gainDb: 0.9, dropDb: -2, introDb: -2.8, leadMid: -4, padMid: -2, leadPres: 2.5, sub40: true, riser: { int: 7, span: 5, f0: 220, f1: 5000, pitched: 0.3 }, cover: { hue: 4, shape: 'arc' }, accent: '#ff7a45',
bassDuck: 1.35,
},
{
id: 'cathedral-of-floodlights', dropLufs: -13.1, title: 'Cathedral of Floodlights', artist: 'Sable Meridian', bpm: 124, keyPc: 7, scale: 'harmonic', form: 'classic',
feel: 'four', harmonicRhythm: '1 (breakdown 2)', seed: 0xca7ed2a1, role: 'harmonic minor, choir',
sections: [['intro', 8], ['groove', 16], ['build', 8], ['drop', 16, 'A'], ['breakdown', 16], ['build', 8], ['drop', 16, 'B', { final: true }], ['groove', 8], ['outro', 8, 'picardy']],
prog: {
intro: 'i i iv iv', groove: 'i iv V i', groove2: 'i bVI iv V',
drop: 'i bVI iv V i bVI iv i', drop2: 'i iv bVI V', dropB: 'i bVI iv V bVI bVI i V',
breakdown: 'bVI bVI iv iv i i bvi! bvi! bVI bVI iv iv bII bII V V',
build: 'bVI bVI iv iv bII bII V7 V7', pedal: 'i iv V i', end: 'V i',
outro: 'i iv V i iv V V V', replay: 'i bVI iv V',
menu: ['i i iv iv bVI bVI V V', 'bVI bVI iv iv i i bvi! bvi!', 'i i bII bII bVI bVI V V'],
},
bass: { main: 'R..R..r.O..O..tb', main2: 'R..R..r.O..O..fr', high: 'R.rR.rr.O.oO.otb', low: 'R-------r-------' },
arp: { base: 65, mask: '1110111011101110', order: [0, 2, 3, 5, 3, 2, 1] },
hats: '9474947494749474', ghosts: [7, 11], kickExtra: [15], kit: { snare: 1, hat: 0, backbeat: 'layered' },
fills: { toms: [4, 1, 6], stop: '........L.L.Lhhh' },
patch: { arp: 'sawsq', arpQ: 7.5, arpDecay: 1.1, padDetune: 15, chorusHz: 0.2, padLP: 700, kickBody: 0.085, kickDrop: 0.03 },
buildPedal: 'none', leadThird: 'vox', leadTimbre: 'super', leadAlt: 'pwm', bassTimbre: 'roll', choir: 1, kickVar: 0.15, leadMax: 91, hook: 'choir', choirB9: true, air: -3, lowShelf: 4, lowShelfHz: 55, body: 5.5, top: -1.5, width: 0.35, leadTrim: 4.3, dropDb: -0.5,
organ: true, perc: { kind: 'taiko', finalOnly: true }, choirK: 0.84, choirLeadDip: { f: 1800, q: 0.9, db: 3 }, grooveDb: -0.7, dropGameDb: 0.5,
lowMid450: 3.5,
kickTrim: 3.25, kickPre: 0.065, arpDb: 3,
kickTail: 46.25, bdCarrier: 'choir', bdEnd: 'iv V',
theme: { head: [[0, 6, 2], [6, 6, 1], [12, 4, 0], [16, 10, -2], [26, 2, -1], [28, 4, 0]],
answer: [2, 2, 3, 2], answerCell: 13, high: 7, leap: 0, devCell: 20, dev: [4, 2, 0, -2, -1, 0], cad: [1, 2, 3, 4], cadCell: 14,
cadFinal: { prog: 'iv V i', notes: [[96, 6, 1], [102, 2, -1], [104, 8, 1], [112, 16, 0]] } },
themeA2: { cad: [2, 3, 4, 6], cadCell: 14 },
themeB: { head: [[0, 6, -1], [6, 2, 0], [8, 4, 1], [12, 4, 2], [16, 10, 0], [26, 2, -1], [28, 4, -2]],
answer: [[32, 6, 0], [38, 2, 1], [40, 8, 2], [48, 4, 3], [52, 4, 1], [56, 8, -1], [64, 6, -2], [70, 2, -1], [72, 4, -3], [76, 4, 0, 'l']],
high: 5, leap: 0, dev: [[80, 8, 5], [88, 4, 4], [92, 4, 2]], cad: [[96, 6, 2], [102, 2, 1], [104, 8, 0], [112, 8, -1], [120, 8, -3]] },
themeB2: { cad: [[96, 6, 2], [102, 2, 3], [104, 8, 2], [112, 8, 1], [120, 8, -1]] },
verse: { cell: [[0, 6], [6, 10], [16, 10]], degs: [[-1, 0, 2], [1, -1, -3], [-2, 2, 4], [3, 2, 0]] },
introDb: 1.5, outroDb: -0.9, gainDb: -0.2, sub40: true, preFinalDb: 1, finalMusic: 1.14, riser: { int: 12, span: 12, pitched: 0.5 }, cover: { hue: 5, shape: 'pillars' }, accent: '#e8eeff',
bassDuck: 1.35,
},
{
id: 'smoke-cannon-shuffle', dropLufs: -13.2, title: 'Smoke Cannon Shuffle', artist: 'Velour Circuit', bpm: 118, keyPc: 5, scale: 'aeolian', form: 'classic',
feel: 'shuffle', harmonicRhythm: '1', seed: 0x5a0cecaf, role: '12/8 shuffle',
sections: [['intro', 8], ['groove', 16], ['build', 4], ['drop', 16, 'A'], ['breakdown', 8], ['build', 8], ['drop', 16, 'B', { final: true, liftBy: 3 }], ['outro', 8]],
prog: {
intro: 'i i iv iv bII bII V V', groove: 'i bVII bVI V iv iv IV V', groove2: 'i iv bVII bvi! iv V i V',
drop: 'i bVI bVII i iv IV bVI V', drop2: 'i iv bVII III iv V iv i', dropB: 'i bVI bVII i bII bII V i',
breakdown: 'bVI bVI iv iv bII bII V V',
build: 'iv iv bVII bVII bVI bVI V V', lift: 'bVII V', pedal: 'i iv i bVII', end: 'V i',
outro: 'i iv bVI V i iv V V', replay: 'i bVII bVI V',
menu: ['i i bVII bVII bVI bVI V V', 'iv iv bVII bVII III III bVI bVI', 'i i iv iv bVII bVII V V'],
},
bass: { main: 'R.r.O.r.R.r.O.sb', main2: 'R.r.O.r.R.f.O.r.', high: 'RrrrOrrrRrrrOtsb', low: 'R---r---R---o---' },
arp: { base: 63, mask: '1101110111011101', order: [0, 1, 2, 4, 2, 1] },
hats: '9585958595859585', ghosts: [6, 14], kickExtra: [14], kit: { snare: 2, hat: 1, backbeat: 'clap' },
fills: { toms: [3, 6, 5], stop: '........S.s.S.s.' },
patch: { arp: 'square', arpQ: 6, arpDecay: 1, padDetune: 13, chorusHz: 0.28, padLP: 680, kickBody: 0.08, kickDrop: 0.032 },
leadThird: 'duo', leadTimbre: 'pwm', leadAlt: 'super', bassTimbre: 'pulse', air: 7, lowShelf: 8, lowShelfHz: 55, body: 4.5, top: 0.5,
perc: { kind: 'ride' }, grooveDb: 0.7, dropGameDb: 0.3,
padTrim: 3.5, width: 0.75, bdCarrier: 'bell', arpDb: 3,
theme: { head: [[0, 6, 0], [6, 2, -1], [8, 4, -3], [12, 1, -1], [13, 1, 0], [14, 2, 1], [16, 6, 2], [22, 2, 1], [24, 4, 0], [28, 4, -1]],
answer: [[32, 6, 3], [38, 2, 4], [40, 4, 3], [44, 2, 1], [46, 2, 2], [48, 6, 4], [54, 2, 4], [56, 4, 2], [60, 4, 1],
[64, 6, 0], [70, 2, -1], [72, 4, -2], [76, 4, -4], [80, 6, -1], [86, 2, -2], [88, 4, -3], [92, 4, -1]],
high: 5, leap: 0, dev: [[96, 4, 2], [100, 4, 0, 'l'], [104, 8, 5]], cad: [[112, 2, 4], [114, 2, 3], [116, 4, 1], [120, 8, -1]],
cadFinal: { prog: 'bVI bVII i', notes: [[96, 4, 3], [100, 4, 1], [104, 8, -1], [112, 16, 0]] } },
themeA2: { cad: [[112, 4, 4], [116, 2, 3], [118, 2, 1], [120, 8, -3]] },
themeB: { head: [[0, 4, -3], [4, 2, -1], [6, 2, 0], [8, 4, -1], [12, 1, 0], [13, 1, 1], [14, 2, 2], [16, 6, 4], [22, 2, 3], [24, 8, 2]],
answer: [1, -1, 0, 2, 1, 0, 1, 1], answerCell: 4, high: 5, leap: 0, devCell: 20, dev: [3, 4, 2, 0, 1, 2], cad: [1, 2, 3, 4, 3, 4], cadCell: 17 },
themeB2: { cad: [1, 2, 4, 3], cadCell: 15 },
verse: { cell: [[0, 6], [8, 6], [16, 8]], degs: [[0, -1, 2], [1, -3, -2], [0, 2, 4], [3, 1, 0]] },
gainDb: 0.4, finalDb: -1.5, introDb: 2.6, sub40: true, riser: { int: 3, span: 12, f0: 300, f1: 7000, pitched: 0.3 }, cover: { hue: 6, shape: 'triplets' }, accent: '#c7a6ff',
},
{
id: 'inversion-at-apogee', dropLufs: -13.0, title: 'Inversion at Apogee', artist: 'Quiet Gantry', bpm: 140, keyPc: 1, scale: 'aeolian', form: 'halftime',
feel: 'half', harmonicRhythm: '2 (verse) / 1', seed: 0x1a7a90e3, role: 'half-time suspense on the ramp cluster',
sections: [['intro', 8], ['halftime', 16], ['build', 8], ['drop', 32, 'A', { themeOrder: ['A', 'A', 'B', 'A'], chordOrder: ['drop', 'drop2', 'dropB', 'drop2'] }], ['breakdown', 8], ['build', 4], ['drop', 16, 'B'], ['outro', 8]],
prog: {
intro: 'ib6 ib6 ib6 ib6', halftime: 'ib6 ib6 bVI bVI ib6 ib6 bII bII', groove: 'ib6 ib6 bVI bVI', groove2: 'ib6 ib6 bII bII',
drop: 'ib6 bVI ib6 bVI bII bII V V', drop2: 'ib6 bVI ib6 bVI iv iv V i', dropB: 'i bII bVI V i bII iv V',
breakdown: 'ib6 ib6 bVI bVI bII bII V V',
build: 'ib6 ib6 ib6 ib6 bII bII bII V', pedal: 'ib6 bVI bVII ib6', end: 'V i',
outro: 'ib6 ib6 bVI bVI bII bII V V', replay: 'ib6 bVI bII V',
menu: ['ib6 ib6 bVI bVI ib6 ib6 bII bII', 'bVI bVI bII bII V V ib6 ib6', 'iv iv ib6 ib6 bVI bVI V V'],
},
bass: { half: 'R-----.rR-----.b', main: 'R-------..r-s-r-', high: 'R---r-r-..R-s-b-', low: 'R---------------' },
arp: { base: 63, mask: '1011101110111011', order: [0, 3, 1, 3, 2, 3] },
hats: '9393939393939393', ghosts: [3, 14], kickExtra: [7], kit: { snare: 2, hat: 2, backbeat: 'clap' },
fills: { toms: [8, 3, 0], stop: '........S.....LL' },
patch: { arp: 'square', arpQ: 9, arpDecay: 0.75, padDetune: 18, chorusHz: 0.35, padLP: 520, kickBody: 0.1, kickDrop: 0.038 },
buildPedal: 'tonic', rampChord: 'ib6', leadThird: 'duo', leadTimbre: 'pwm', leadAlt: 'bellsaw', bassTimbre: 'reese', breakReese: true, air: 10, sub: { lo: 25, db: 2 }, hook: 'bellInv', body: 6,
kickTail: 46.25, kickTrim: 1.5, padTrim: 3, width: 0.75, bdCarrier: 'bell', arpDb: 4,
spic: { pat: 'R.rRr.rRR.rRr.of', acc: '1001001010010010' },
dropGameDb: 0.4,
theme: { head: [[0, 3, -2], [3, 3, -3], [6, 4, 0], [10, 2, 1], [12, 4, 0], [16, 2, 2], [18, 4, 3], [22, 4, 2], [26, 6, 4]],
answer: [[32, 6, 2], [38, 2, 3], [40, 4, 4], [44, 4, 2], [48, 8, 0], [56, 4, -1], [60, 4, 0], [64, 6, 2], [70, 2, 1], [72, 4, -1], [76, 4, -2, 'l']],
high: 5, leap: -2, dev: [[80, 8, 5], [88, 2, 4], [90, 2, 3], [92, 4, 4]], cad: [[96, 4, 4], [100, 4, 3], [104, 8, 1], [112, 8, -1], [120, 8, -3]],
cadFinal: { prog: 'iv V i', notes: [[96, 4, 4], [100, 4, 1], [104, 8, -1], [112, 16, 0]] } },
themeA2: { cad: [[96, 4, 4], [100, 2, 3], [102, 2, 2], [104, 8, 1], [112, 16, -3]] },
themeB: { head: [[0, 3, 0], [3, 3, -1], [6, 4, -3], [10, 2, -2], [12, 4, 0], [16, 2, 3], [18, 4, 5], [22, 4, 2], [26, 6, 1]],
answer: [3, 4, 5, 4, 2, 3, 2, 1], answerCell: 0, high: 7, leap: 0, devCell: 24, dev: [4, 2, 3, 5, 4, 3], cad: [2, 3, 2, 1], cadCell: 14 },
themeB2: { cad: [3, 2, 2, 1], cadCell: 15 },
verse: { cell: [[0, 6], [6, 6], [16, 8]], degs: [[-2, -3, 0], [2, 1, -1], [0, 2, 4], [3, 1, 0]] },
outroDb: -0.8, gainDb: -1.0, introDb: 1, sub40: true, riser: { int: 6, span: 12, f1: 9000, pitched: 0.4 }, cover: { hue: 7, shape: 'apogee' }, accent: '#4d7cff',
},
{
id: 'asphalt-constellations', dropLufs: -13.2, title: 'Asphalt Constellations', artist: 'Corvid Engine', bpm: 124, keyPc: 0, scale: 'aeolian', form: 'classic',
feel: 'broken', harmonicRhythm: '1', seed: 0xa5fa17c0, role: 'broken beat, Dorian lift',
sections: [['intro', 8], ['groove', 16], ['build', 8], ['drop', 16, 'A'], ['breakdown', 16], ['build', 4], ['drop', 32, 'B', { final: true, liftBy: 3 }], ['outro', 16]],
prog: {
intro: 'i i IV IV', groove: 'i IV bVI bVII i IV iv V', groove2: 'i bVII IV IV',
drop: 'i bVII III IV i bVII bII V', drop2: 'i bVII IV IV bVI bVI bII V', dropB: 'i III bVII IV',
breakdown: 'bVI bVI bVII bVII iv iv i i bVI bVI bII bII iv iv V V',
build: 'i i IV IV bVI bVII V V', lift: 'bVII V', pedal: 'i IV i bVII', end: 'V i',
outro: 'i IV bVI bVII', replay: 'i IV bVI bVII',
menu: ['i i IV IV bVI bVI bVII bVII', 'bVI bVI bVII bVII iv iv i i', 'i i III III bVII bVII IV IV'],
},
liftMode: 'ionian',
liftProg: {
drop: 'I bVII I II vi bVII bVI bVII', drop2: 'I iii IV IV bVI bVI bVII bVII', dropB: 'I V vi IV I bVII bVI bVII',
pedal: 'I IV I bVII', outro: 'I IV bVI bVII I IV bVI bVI', end: 'bVII I',
},
bass: { main: 'R..R..r.R.O..rsb', main2: 'R..R..o.R.O..tsb', high: 'R.rR.ro.RrO.rtsb', low: 'R-----r-R-------' },
arp: { base: 64, mask: '1111111011111110', order: [0, 1, 2, 3, 4, 5] },
hats: '9483948394839483', kickExtra: [10], kit: { snare: 0, hat: 1, backbeat: 'gated' },
fills: { toms: [6, 0, 3], stop: '........s.sSs.SL' },
patch: { arp: 'sawsq', arpQ: 5.5, arpDecay: 0.85, padDetune: 11, chorusHz: 0.21, padLP: 780, kickBody: 0.078, kickDrop: 0.028 },
leadThird: 'super', leadTimbre: 'bellsaw', leadAlt: 'duo', bassTimbre: 'roll', air: -7.5, leadMax: 91, sub2: 0.65, presence: -1.5, width: 0.5, kickTrim: 5, dropDb: -0.5,
swing: 0.56, ghosts: [3, 7, 9, 11, 15], perc: { kind: 'machine', pat: 'm..m.m..m..m.m.m' },
finalDb: -0.5, kickPre: 0.065,
kickTail: 46.5, bdCarrier: 'choir', bdEnd: 'iv V',
theme: { head: [[0, 3, 4], [3, 3, 6], [6, 6, 7], [12, 2, 6], [14, 2, 4], [16, 4, 3], [20, 4, 2], [24, 6, 1], [30, 2, 4, 'l']],
high: 9, leap: 4, dev: [[32, 8, 9], [40, 2, 8], [42, 2, 7], [44, 4, 6], [48, 6, 5], [54, 2, 4], [56, 4, 3], [60, 4, 2]],
answer: [[64, 6, 2], [70, 2, 2], [72, 4, 1], [76, 4, 0], [80, 4, 1], [84, 2, 2], [86, 2, 3], [88, 8, 4]],
cad: [[96, 6, 2], [102, 2, 2], [104, 4, 1], [108, 4, -1], [112, 8, 1], [120, 8, 0]],
cadFinal: { prog: 'bVI bVII I', notes: [[96, 6, 1], [102, 2, 3], [104, 8, 1], [112, 16, 2]] } },
themeA2: { cad: [[96, 4, 2], [100, 4, 3], [104, 4, 2], [108, 4, 0], [112, 16, 1]] },
themeB: { head: [[0, 3, 2], [3, 3, 4], [6, 6, 3], [12, 2, 4], [14, 2, 2], [16, 4, 1], [20, 4, 0], [24, 8, -1]],
answer: [0, 2, 1, 3, 4, 3, 5, 4, 3], answerCell: 1, high: 7, leap: 0, devCell: 23, dev: [6, 4, 5, 3], cad: [2, 1, 3, 4, 1, 0], cadCell: 17 },
themeB2: { cad: [0, 1, 2, 4], cadCell: 14 },
verse: { cell: [[0, 3], [6, 6], [16, 8]], degs: [[0, 2, -1], [-3, -1, 1], [0, 1, 4], [3, 2, 0]] },
outroDb: -0.5, gainDb: 1.1, sub40: true, preFinalDb: 1, introDb: 1.4, riser: { int: 7, span: 24, f1: 8500, pitched: 0.4 }, cover: { hue: 8, shape: 'stars' }, accent: '#ffd86b',
bassDuck: 1.35,
},  {
id: 'phosphor-runway', dropLufs: -12.8, title: 'Phosphor Runway', artist: 'Cinder Relay', bpm: 104, keyPc: 3, scale: 'phrygian', form: 'classic',
feel: 'four', harmonicRhythm: '1 (breakdown 2)', seed: 0x9405f0a7, role: 'slow Phrygian stomp: the runway lights at night',
sections: [['intro', 8], ['groove', 16], ['build', 8], ['drop', 16, 'A'], ['breakdown', 16], ['build', 4], ['drop', 16, 'B', { final: true }], ['outro', 8]],
prog: {
intro: 'i i bvii bvii bVI bVI bII bII', groove: 'i bvii bVI bII i bvii iv bII', groove2: 'i bII bVI bvii iv iv bII bII',
drop: 'i bII bVI bvii iv III bII bvii', drop2: 'i bII iv III i bVI bII i', dropB: 'i III bvii i iv bVI bII i',
breakdown: 'i i bVI bVI bII bII bvii bvii i i bVI bVI iv iv bvii bII',
build: 'iv iv bVI bVI bvii bvii bII bII', pedal: 'i bII bvii bII', end: 'bII i',
outro: 'i bvii bVI bII i bvii bII bII', replay: 'i bII bvii bII',
menu: ['i i bVI bVI bII bII bvii bvii', 'iv iv bVI bVI i i bII bII', 'i i bvii bvii bVI bVI iv iv'],
},
bass: { main: 'R.rrO.rrR.rrO.sr', main2: 'R.rrO.rsR.rrO.so', high: 'RrrrOrrrRrrrOsrs', low: 'R-----r-R-----s-' },
arp: { base: 64, mask: '1101011011010110', order: [0, 3, 2, 4, 1, 3] },
hats: '9562956295629562', ghosts: [6, 11, 15], kickExtra: [13], kit: { snare: 2, hat: 0, backbeat: 'layered' },
fills: { toms: [7, 1, 4], stop: '........S..sS.sS' },
patch: { arp: 'square', arpQ: 6.5, arpDecay: 0.9, padDetune: 12, chorusHz: 0.19, padLP: 620, kickBody: 0.09, kickDrop: 0.034 },
buildPedal: 'tonic', leadThird: 'duo', leadTimbre: 'bellsaw', leadAlt: 'vox', bassTimbre: 'pulse', air: 0, body: 5, width: 0.5, kickTrim: 2, sub2: 0.6,
swing: 0.5, spic: { pat: 'R.rRo.rRR.rRo.fR', acc: '1000100010001000' }, perc: { kind: 'taiko' },
bdCarrier: 'bell', bdEnd: 'bvii bII',
theme: { head: [[0, 3, 0], [3, 3, 1], [6, 4, 2], [10, 4, 4], [14, 2, 3], [16, 8, 5], [24, 2, 4], [26, 2, 3], [28, 4, 1]],
answer: [[32, 6, 0], [38, 2, -1], [40, 4, -3], [44, 4, -2], [48, 6, -3], [54, 2, -2], [56, 8, -1], [64, 6, 0], [70, 2, 1], [72, 4, 2], [76, 4, 3], [80, 8, 4], [88, 6, 2]],
high: 8, leap: 3, dev: [[94, 2, 3, 'l'], [96, 8, 8], [104, 4, 7], [108, 4, 5]], cad: [[112, 4, 4], [116, 12, 1]],
cadFinal: { prog: 'III bII i', notes: [[96, 8, 8], [104, 2, 7], [106, 2, 5], [108, 4, 3], [112, 16, 0]] } },
themeA2: { cad: [[112, 4, 3], [116, 12, 0]] },
themeB: { head: [[0, 6, 4], [6, 6, 5], [12, 6, 4], [18, 6, 2], [24, 4, 1], [28, 4, 0]],
answer: [[32, 4, -1], [36, 4, -3], [40, 6, -2], [46, 2, -1], [48, 6, 0], [54, 2, -1], [56, 8, -3]],
high: 7, leap: 0, dev: [[64, 6, 0], [70, 2, 1], [72, 4, 2], [76, 2, 1], [78, 2, 0, 'l'], [80, 8, 7], [88, 4, 6], [92, 4, 5]],
cad: [[96, 6, 3], [102, 2, 2], [104, 8, 1], [112, 16, 0]] },
themeB2: { cad: [[96, 4, 4], [100, 4, 3], [104, 8, 2], [112, 16, 0]] },
verse: { cell: [[0, 3], [3, 7], [10, 6], [16, 8]], degs: [[-3, -1, 0, 1], [0, -2, -3, -1], [0, 2, 3, 4], [3, 2, 3, 1]] },
gainDb: 0.7, introDb: 0, outroDb: -1.6, preFinalDb: 1, finalDb: -0.5, dropGameDb: -0.3, sub40: true, riser: { int: 5, span: 12, f0: 200, f1: 7500, pitched: 0.35 }, cover: { hue: 9, shape: 'runway' }, accent: '#a6ff4d',
},
];
const KEYN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MODEN = { aeolian: 'minor', phrygian: 'Phrygian', dorian: 'Dorian', harmonic: 'harmonic minor' };
export const keyLabel = (t) => `${KEYN[t.keyPc]} ${MODEN[t.scale || t.mode] || 'minor'}`;
export const ALBUM = 'Launch Night — Original Score';
export const trackBars = (t) => t.sections.reduce((a, s) => a + s[1], 0);
export const RING_BARS = 1.5;
export const trackDuration = (t, ring = false) => (trackBars(t) + (ring ? RING_BARS : 0)) * 240 / t.bpm;
export const trackIndex = (id, list = TRACKS) => list.findIndex((t) => t.id === id);
export function listing(list = TRACKS, endless = false) {
return list.map((t) => ({
id: t.id, title: t.title, artist: t.artist, album: ALBUM, accent: t.accent || '#ffffff', bpm: t.bpm, key: keyLabel(t), scale: t.scale || t.mode, feel: t.feel, form: t.form,
durationSec: endless ? null : +trackDuration(t, false).toFixed(2), segueSec: endless ? null : +trackDuration(t, false).toFixed(2), gapSec: +(RING_BARS * 240 / t.bpm).toFixed(2),
}));
}
export function createBag(n, seed = 1) {
let bag = [], round = 0;
const fill = (cur, r) => {
const rng = new Rng(((seed >>> 0) ^ Math.imul(r + 1, 0x9e3779b1)) >>> 0);
const b = [];
for (let i = 0; i < n; i++) if (i !== cur) b.push(i);
for (let i = b.length - 1; i > 0; i--) { const j = rng.int(0, i); const x = b[i]; b[i] = b[j]; b[j] = x; }
return b;
};
const refill = (cur) => { bag = fill(cur, round++); };
return {
next(cur) {
if (n <= 1) return 0;
bag = bag.filter((i) => i !== cur);
if (!bag.length) refill(cur);
return bag.shift();
},
peek(cur) {
if (n <= 1) return 0;
bag = bag.filter((i) => i !== cur);
if (!bag.length) refill(cur);
return bag[0];
},
queue(cur, k) {
if (n <= 1) return Array.from({ length: k }, () => 0);
let b = bag.slice(), r = round, c = cur;
const out = [];
for (let i = 0; i < k; i++) {
b = b.filter((x) => x !== c);
if (!b.length) b = fill(c, r++);
c = b.shift(); out.push(c);
}
return out;
},
reset(cur) { refill(cur); },
get remaining() { return bag.slice(); },
};
}
const coverDataCache = new Map();
export function coverData(t) {
let d = coverDataCache.get(t.id);
if (d) return d;
const song = makeSong(null, 0, null, { track: t });
const drop = song.sections.find((s) => s.type === 'drop' && s.leadNotes && s.leadNotes.length);
const first = drop ? drop.leadNotes.filter((n) => n.step < 128) : [];
const line = first.map((n) => ({ s: n.step, l: n.len, m: n.midi, head: n.role === 'head' }));
const energy = [];
for (const s of song.sections) for (let b = 0; b < s.bars; b++) energy.push(Math.min(1, sectionBase(s.type, (b + 0.5) / s.bars) * 0.7 + 0.32));
d = { line, energy, tonic: leadTonic(t.keyPc), bars: song.totalBars };
coverDataCache.set(t.id, d);
return d;
}
const coverCache = new Map();
function makeCanvas(px) {
if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(px, px);
if (typeof document !== 'undefined' && document.createElement) { const c = document.createElement('canvas'); c.width = px; c.height = px; return c; }
return null;
}
const THEMES = {
white: { line: [255, 255, 255], accent: [255, 42, 60], dim: [150, 160, 175] },
red: { line: [255, 52, 70], accent: [255, 176, 0], dim: [150, 40, 50] },
};
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export function paintCover(g, t, S, theme = 'white') {
const C = THEMES[theme] || THEMES.white, d = coverData(t);
const idx = TRACKS.indexOf(t);
const W = Math.max(1.5, S * 0.022);
const GLOW = S * 0.06;
const cx = S / 2, cy = S * 0.46, R = S * 0.3;
const E = d.energy, N = E.length;
const eAt = (u) => { const x = Math.max(0, Math.min(N - 1, u * (N - 1))), i = Math.floor(x), f = x - i; return E[i] * (1 - f) + E[Math.min(N - 1, i + 1)] * f; };
const shape = (t.cover && t.cover.shape) || 'halo';
g.save();
g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
if (g.createRadialGradient) {
const rg = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, S * 0.72);
if (rg && rg.addColorStop) { rg.addColorStop(0, rgba(C.dim, 0.16)); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, S, S); }
}
g.lineJoin = 'round'; g.lineCap = 'round';
const stroke = (draw, col, w = W, glow = true) => {
if (glow) { g.shadowColor = rgba(col, 0.9); g.shadowBlur = GLOW; g.strokeStyle = rgba(col, 0.55); g.lineWidth = w; g.beginPath(); draw(); g.stroke(); }
g.shadowBlur = 0; g.shadowColor = 'rgba(0,0,0,0)';
g.strokeStyle = rgba(col, 1); g.lineWidth = w; g.beginPath(); draw(); g.stroke();
};
const dot = (x, y, r, col) => { g.shadowColor = rgba(col, 0.9); g.shadowBlur = GLOW * 0.6; g.fillStyle = rgba(col, 1); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0; };
const poly = (pts) => () => { pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
const M = 72;
switch (shape) {
case 'halo': {
const pts = [];
for (let k = 0; k <= M; k++) { const u = k / M, a = -Math.PI / 2 + u * Math.PI * 2, r = R * (0.82 + 0.28 * eAt(u)); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
stroke(poly(pts), C.line);
stroke(() => { g.arc(cx, cy + R * 0.15, R * 0.42, Math.PI * 1.08, Math.PI * 1.92); }, C.accent);
break;
}
case 'jcurve': {
stroke(() => {
g.moveTo(cx - R * 0.6, cy - R * 0.95);
g.lineTo(cx - R * 0.6, cy + R * 0.2);
g.quadraticCurveTo(cx - R * 0.6, cy + R * 0.95, cx + R * 0.15, cy + R * 0.95);
g.quadraticCurveTo(cx + R * 0.75, cy + R * 0.95, cx + R * 0.8, cy + R * 0.25);
}, C.line);
for (let k = 0; k < 12; k++) { const u = k / 11, y = cy - R * 0.95 + u * R * 1.15, l = R * (0.08 + 0.32 * eAt(u)); stroke(() => { g.moveTo(cx - R * 0.6 - W * 1.5, y); g.lineTo(cx - R * 0.6 - W * 1.5 - l, y); }, C.dim, W * 0.8, false); }
dot(cx + R * 0.8, cy + R * 0.25 - W * 3, W * 1.6, C.accent);
break;
}
case 'wave': {
const pts = [];
for (let k = 0; k <= M; k++) { const u = k / M, x = cx - R * 1.25 + u * R * 2.5, y = cy + Math.sin(u * Math.PI * 4) * R * (0.15 + 0.6 * eAt(u)); pts.push([x, y]); }
stroke(poly(pts), C.line, W * 1.25);
stroke(poly(pts.map(([x, y]) => [x, cy + (y - cy) * 0.45 + R * 0.55])), C.accent, W * 0.9);
break;
}
case 'twin': {
const e1 = Math.max(...E.slice(0, N >> 1)), e2 = Math.max(...E.slice(N >> 1));
const peak = (x0, h) => () => { g.moveTo(x0 - R * 0.5, cy + R * 0.7); g.lineTo(x0, cy + R * 0.7 - R * 1.5 * h); g.lineTo(x0 + R * 0.5, cy + R * 0.7); };
stroke(peak(cx - R * 0.42, 0.55 + 0.4 * e1), C.line);
stroke(peak(cx + R * 0.42, 0.55 + 0.4 * e2), C.accent);
stroke(() => { g.moveTo(cx - R * 1.1, cy + R * 0.7); g.lineTo(cx + R * 1.1, cy + R * 0.7); }, C.dim, W * 0.8, false);
break;
}
case 'arc': {
stroke(() => { g.arc(cx, cy + R * 0.45, R * 0.75, Math.PI, Math.PI * 2); }, C.accent, W * 1.2);
stroke(() => { g.moveTo(cx - R * 1.2, cy + R * 0.45); g.lineTo(cx + R * 1.2, cy + R * 0.45); }, C.line);
for (let k = 0; k < 9; k++) {
const u = k / 8, a = Math.PI + u * Math.PI, l = R * (0.12 + 0.3 * eAt(u)), r0 = R * 0.92;
stroke(() => { g.moveTo(cx + r0 * Math.cos(a), cy + R * 0.45 + r0 * Math.sin(a)); g.lineTo(cx + (r0 + l) * Math.cos(a), cy + R * 0.45 + (r0 + l) * Math.sin(a)); }, C.line, W * 0.8, k % 2 === 0);
}
break;
}
case 'pillars': {
const secs = []; let b0 = 0;
for (const s of t.sections) { secs.push((b0 + s[1] / 2) / d.bars); b0 += s[1]; }
const n = secs.length, base = cy + R * 0.8;
for (let k = 0; k < n; k++) { const x = cx - R + (2 * R) * (k + 0.5) / n, h = R * (0.5 + 1.1 * eAt(secs[k])); stroke(() => { g.moveTo(x, base); g.lineTo(x, base - h); }, k === n - 2 ? C.accent : C.line, W * 0.9, true); }
stroke(() => { g.arc(cx, base - R * 0.95, R * 1.05, Math.PI * 1.1, Math.PI * 1.9); }, C.line);
break;
}
case 'triplets': {
for (let k = 0; k < 3; k++) {
const a = -Math.PI / 2 + k * Math.PI * 2 / 3, r = R * (0.24 + 0.2 * eAt((k + 0.5) / 3));
stroke(() => { g.arc(cx + R * 0.52 * Math.cos(a), cy + R * 0.52 * Math.sin(a), r, 0, Math.PI * 2); }, k === 0 ? C.accent : C.line);
}
break;
}
case 'apogee': {
stroke(() => { if (g.ellipse) g.ellipse(cx, cy, R * 1.1, R * 0.5, -0.35, 0, Math.PI * 2); else g.arc(cx, cy, R * 0.8, 0, Math.PI * 2); }, C.line);
const ap = [cx + R * 1.1 * Math.cos(-0.35), cy + R * 1.1 * Math.sin(-0.35)];
dot(ap[0], ap[1], W * 2.2, C.accent);
const hMax = Math.max(...E);
stroke(() => { g.moveTo(cx - R * 0.85, cy + R * 0.95); g.quadraticCurveTo(cx, cy + R * (0.95 - 0.9 * (0.4 + 0.6 * hMax)), cx + R * 0.85, cy + R * 0.95); }, C.accent, W * 0.9);
break;
}
case 'runway': {
const hy = cy - R * 0.62, by = cy + R * 1.05, bw = R * 1.2, tw = R * 0.08;
const ex = (sd, u) => cx + sd * (bw + (tw - bw) * u);
const ey = (u) => by + (hy - by) * (1 - Math.pow(1 - u, 1.6));
stroke(() => { g.moveTo(cx - R * 1.3, hy); g.lineTo(cx + R * 1.3, hy); }, C.dim, W * 0.8, false);
for (const sd of [-1, 1]) stroke(() => { g.moveTo(ex(sd, 0), by); g.lineTo(ex(sd, 1), hy); }, C.line, W * 0.9);
for (let k = 0; k < 6; k++) { const u0 = k / 6 + 0.02, u1 = u0 + 0.07; stroke(() => { g.moveTo(cx, ey(u0)); g.lineTo(cx, ey(u1)); }, C.dim, W * (1 - 0.3 * u0), false); }
for (let k = 0; k < 9; k++) {
const u = k / 9, y = ey(u), r = W * (1.5 - u) * (0.55 + 0.6 * eAt(u));
for (const sd of [-1, 1]) dot(ex(sd, u) + sd * W * 1.3 * (1 - u), y, Math.max(W * 0.35, r), C.line);
}
stroke(() => { g.moveTo(ex(-1, 0.06), ey(0.06)); g.lineTo(ex(1, 0.06), ey(0.06)); }, C.accent, W);
dot(cx, hy, W * 1.6, C.accent);
break;
}
default: {
const L = d.line.length ? d.line : [{ s: 0, m: 60 }, { s: 64, m: 67 }, { s: 127, m: 62 }];
const lo = Math.min(...L.map((n) => n.m)), hi = Math.max(...L.map((n) => n.m));
const pick = L.filter((n, i) => i % Math.max(1, Math.round(L.length / 7)) === 0 || n.m === hi);
const pts = pick.map((n) => [cx - R * 1.1 + 2.2 * R * n.s / 128, cy + R * 0.7 - 1.5 * R * (n.m - lo) / Math.max(1, hi - lo)]);
stroke(poly(pts), C.line, W * 0.9);
pts.forEach(([x, y], i) => dot(x, y, W * (pick[i].m === hi ? 2.3 : 1.4), pick[i].m === hi ? C.accent : C.line));
break;
}
}
const L = d.line;
if (L.length && shape !== 'stars') {
const lo = Math.min(...L.map((n) => n.m)), hi = Math.max(...L.map((n) => n.m));
const X = (st) => S * 0.26 + S * 0.48 * st / 128, Y = (m) => S * 0.87 - S * 0.07 * (m - lo) / Math.max(1, hi - lo);
const nh = L.filter((n) => n.head).length || 5;
const seg = (a, b) => () => { for (let i = a; i < b; i++) { const n = L[i]; if (i === a) g.moveTo(X(n.s), Y(n.m)); else g.lineTo(X(n.s), Y(n.m)); g.lineTo(X(n.s + n.l), Y(n.m)); } };
stroke(seg(nh - 1, L.length), C.dim, W * 0.7, false);
stroke(seg(0, Math.min(nh, L.length)), C.accent, W * 0.7, false);
}
g.shadowBlur = 0;
g.fillStyle = rgba(C.dim, 0.9);
for (let i = 0; i <= idx; i++) g.fillRect(S * 0.07 + i * W * 1.6, S * 0.93, W * 0.9, W * 0.9);
g.restore();
}
export function drawCover(ctx, trackId, size, theme = 'white', opts = {}) {
const t = TRACKS.find((x) => x.id === trackId) || (opts.tracks || []).find((x) => x.id === trackId);
if (!t || !ctx) return false;
const dpr = opts.dpr ?? (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1);
const px = Math.max(16, Math.round(size * dpr));
const key = t.id + '|' + px + '|' + theme;
let c = coverCache.get(key);
if (!c) {
c = makeCanvas(px);
if (!c) {
ctx.save(); ctx.translate(opts.x || 0, opts.y || 0); ctx.scale(size / px, size / px); paintCover(ctx, t, px, theme); ctx.restore();
return true;
}
paintCover(c.getContext('2d'), t, px, theme);
coverCache.set(key, c);
if (coverCache.size > 48) coverCache.delete(coverCache.keys().next().value);
}
ctx.drawImage(c, opts.x || 0, opts.y || 0, size, size);
return true;
}
