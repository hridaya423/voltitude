import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const FADE_IN = 0.03;
const FADE_OUT = 0.06;
const STING = { src: "../assets/audio/sfx.m4a", from: 16.3465, length: 3.4, gain: 3 };
const html = readFileSync(new URL("index.html", import.meta.url), "utf8");
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))[1];
const shots = [...html.matchAll(/<video [^>]*>/g)].map(([tag]) => ({
  src: attr(tag, "src"),
  start: Number(attr(tag, "data-start")),
  duration: Number(attr(tag, "data-duration")),
  from: Number(attr(tag, "data-media-start")),
}));
const length = Number(html.match(/data-composition-id="main"[^>]*data-duration="([^"]*)"/)[1]);
const stingAt = Number(attr(html.match(/<div id="endcard"[^>]*>/)[0], "data-start"));

const inputs = [...shots.flatMap((s) => ["-i", s.src]), "-i", STING.src];
const legs = shots.map((s, i) =>
  `[${i}:a]atrim=${s.from}:${s.from + s.duration},asetpts=PTS-STARTPTS,` +
  `afade=t=in:d=${FADE_IN},afade=t=out:st=${(s.duration - FADE_OUT).toFixed(3)}:d=${FADE_OUT},` +
  `adelay=${Math.round(s.start * 1000)}:all=1[a${i}]`);
const sting = `[${shots.length}:a]atrim=${STING.from}:${STING.from + STING.length},asetpts=PTS-STARTPTS,volume=${STING.gain}dB,afade=t=out:st=${STING.length - 0.5}:d=0.5,adelay=${Math.round(stingAt * 1000)}:all=1[sting]`;
const graph = `${legs.join(";")};${sting};${shots.map((_, i) => `[a${i}]`).join("")}[sting]amix=inputs=${shots.length + 1}:normalize=0,apad,atrim=0:${length}[out]`;

execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", graph, "-map", "[out]",
  "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "assets/clips/mix.m4a"],
  { cwd: new URL(".", import.meta.url), stdio: "inherit" });
console.log(`mixed ${shots.length} shots and the end sting into assets/clips/mix.m4a (${length} s)`);
