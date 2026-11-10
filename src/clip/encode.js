const CODECS = [['avc1.640028', 'avc'], ['avc1.42E01E', 'avc'], ['vp09.00.31.08', 'vp9']], HIGH = [['avc1.640033', 'avc'], ...CODECS];
const KEY_EVERY = 60;

export async function probe(width, height, fps = 60, bitrate = Math.round(12e6 * (width * height) / (1920 * 1080))) {
  if (typeof VideoEncoder === 'undefined') return null;
  for (const [codec, mux] of bitrate > 20e6 ? HIGH : CODECS) {
    const r = await VideoEncoder.isConfigSupported({ codec, width, height, framerate: fps, bitrate }).catch(() => null);
    if (r?.supported) return { codec, mux, config: r.config };
  }
  return null;
}

const AAC = (audio) => ({ codec: 'mp4a.40.2', numberOfChannels: audio.channels, sampleRate: audio.sampleRate, bitrate: 128000 });

export async function createClipEncoder({ width, height, fps = 60, audio = null, bitrate }) {
  if (audio && !(typeof AudioEncoder !== 'undefined' && (await AudioEncoder.isConfigSupported(AAC(audio)).catch(() => null))?.supported)) audio = null;
  const picked = await probe(width, height, fps, bitrate);
  if (!picked) throw new Error('This browser cannot encode video');
  const { Muxer, ArrayBufferTarget } = await import('@rl/vendor/mp4-muxer-5.2.2/mp4-muxer.mjs');
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target, fastStart: 'in-memory', firstTimestampBehavior: 'offset',
    video: { codec: picked.mux, width, height, frameRate: fps },
    audio: audio ? { codec: 'aac', numberOfChannels: audio.channels, sampleRate: audio.sampleRate } : undefined,
  });
  let failure = null, n = 0;
  const video = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { failure = e; } });
  video.configure(picked.config);
  const sound = audio ? new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (e) => { failure = e; } }) : null;
  sound?.configure(AAC(audio));
  return {
    codec: picked.codec,
    audio: !!sound,
    async addFrame(source, timestamp) {
      const frame = new VideoFrame(source, { timestamp, duration: Math.round(1e6 / fps) });
      video.encode(frame, { keyFrame: n++ % KEY_EVERY === 0 });
      frame.close();
      while (video.encodeQueueSize > 6) await new Promise((r) => video.addEventListener('dequeue', r, { once: true }));
    },
    addAudio(data) { sound.encode(data); data.close(); },
    async finish() {
      await video.flush();
      await sound?.flush();
      if (failure) throw failure;
      muxer.finalize();
      return new Blob([target.buffer], { type: 'video/mp4' });
    },
  };
}
