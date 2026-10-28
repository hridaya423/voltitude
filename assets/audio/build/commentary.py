import sys, os, json, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import soundfile as sf
from scipy import signal
import build as B

SR = B.SR
VOICES = {'P': ('onwK4e9ZLuTAKqWW03F9', 'Daniel', dict(stability=0.28, similarity_boost=0.8, style=0.62, use_speaker_boost=True)),
          'C': ('JBFqnCBsd6RMkjVDRZzb', 'George', dict(stability=0.42, similarity_boost=0.8, style=0.35, use_speaker_boost=True))}

LINES = {
    'lights_out': [('P', 'And it is lights out, and away we go!'), ('P', 'Lights out! The Grand Prix is under way!')],
    'lap2': [('C', 'Lap two begins, and it is all still to play for.')],
    'final_lap': [('P', 'Final lap! Everything on the line!'), ('P', 'Last time around, and nobody is giving an inch.')],
    'overtake': [('P', 'Beautiful move! He is through!'), ('P', 'And he is past! Brilliant overtake.'), ('C', 'Great run out of the corner, and he sends it up the inside.')],
    'overtake_lead': [('P', 'He takes the lead! Unbelievable!'), ('P', 'And that is the lead! He has gone to the front!')],
    'overtaken': [('P', 'He has been passed. He will want that one back.'), ('C', 'Not enough pace through that last corner. He has lost the place.')],
    'contact': [('P', 'Contact! They have touched!'), ('C', 'A bit of a tap there. All four wheels still on, though.')],
    'near_miss': [('P', 'Ooh, that was close! Millimetres!'), ('C', 'Nothing between them at all there.')],
    'big_air': [('P', 'Look at that air! What a jump!'), ('C', 'The thrusters are keeping that nose level, mind you.')],
    'perfect': [('C', 'Beautifully landed. Textbook.')],
    'hard': [('C', 'That is a heavy landing. The suspension will remember that one.')],
    'wreck': [('P', 'Oh no! He is in the wall!'), ('C', 'That is a big one. Ouch.')],
    'boost': [('P', 'Thrusters lit! He is spending the gas.'), ('C', 'Burning gas to make that pass. The tank will not last forever.')],
    'gas_low': [('C', 'Gas is getting low. He will have to save what is left.')],
    'fastest_lap': [('P', 'Fastest lap of the race!')],
    'purple': [('P', 'A purple sector! Nobody has been quicker through there.')],
    'leading': [('C', 'He leads, but the pack is right on his tail.')],
    'kerb': [('C', 'Using every inch of the kerb there.')],
    'finish_win': [('P', 'Chequered flag! He wins the Grand Prix!'), ('P', 'He takes the flag! What a drive, what a win!')],
    'finish_podium': [('P', 'Chequered flag, and a podium finish!')],
    'finish': [('P', 'And that is the flag. A solid drive to the end.')],
}


def tts(name, voice, text):
    d = os.path.join(B.WORK, 'tts_el')
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, name + '.mp3')
    if not os.path.exists(p):
        vid, _, settings = VOICES[voice]
        body = json.dumps({'text': text, 'model_id': 'eleven_multilingual_v2', 'voice_settings': settings}).encode()
        subprocess.run(['curl', '-sf', '-X', 'POST', '-H', 'xi-api-key: ' + os.environ['ELEVENLABS_API_KEY'], '-H', 'Content-Type: application/json', '-d', body.decode(), '-o', p,
                        f'https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128'], check=True)
    return B.load(p, 1)[:, 0]


def trim(x, floor_db=-45, margin=0.03):
    idx = np.where(np.abs(x) > np.abs(x).max() * 10 ** (floor_db / 20))[0]
    m = int(margin * SR)
    return x[max(0, idx[0] - m): idx[-1] + m]


def broadcast_chain(x):
    x = B.hpf(x[:, None], 110, 2)[:, 0]
    sos = signal.butter(2, [2200, 4200], 'bandpass', fs=SR, output='sos')
    x = x + 0.18 * signal.sosfilt(sos, x)
    x = B.lpf(x[:, None], 9500, 2)[:, 0]
    thr = 10 ** (-22 / 20)
    env = np.maximum(np.abs(x), 1e-9)
    a = np.exp(-1 / (0.004 * SR)); r = np.exp(-1 / (0.12 * SR))
    e = np.empty_like(env); s = 0.0
    for i, v in enumerate(env):
        s = a * s + (1 - a) * v if v > s else r * s + (1 - r) * v
        e[i] = s
    g = np.where(e > thr, (e / thr) ** (1 / 3.0 - 1), 1.0)
    return x * g


def main():
    gap = int(0.35 * SR)
    chunks, cues, lines, pos = [], {}, {}, 0
    for lid, variants in LINES.items():
        lines[lid] = []
        for k, (voice, text) in enumerate(variants):
            name = f'{lid}_{k}'
            x = broadcast_chain(trim(tts(name, voice, text)))
            x = x[:, None]
            x = x * B.db(-19 - B.lufs_int(np.tile(x, (2, 1)) if len(x) < SR else x))
            pk = np.abs(x).max()
            if pk > B.db(-1.5):
                x *= B.db(-1.5) / pk
            x = B.fade(x, 0.004, 0.06)
            cues[name] = [round((pos + int(0.2 * SR)) / SR, 4), round(len(x) / SR, 4)]
            lines[lid].append(name)
            chunks += [x, np.zeros((gap, 1))]
            pos += len(x) + gap
            print(f'{name:16s} {voice} {len(x)/SR:5.2f}s  {text}')
    full = np.concatenate([np.zeros((int(0.2 * SR), 1))] + chunks)
    size = B.encode('commentary', full, 64, 1)
    mf = os.path.join(B.OUT, 'manifest.json')
    man = json.load(open(mf))
    man['commentary'] = dict(file='commentary.m4a', cues=cues, lines=lines)
    json.dump(man, open(mf, 'w'), indent=1)
    print(f'commentary {len(full)/SR:.1f}s {size/1024:.1f} KB')


if __name__ == '__main__':
    main()
