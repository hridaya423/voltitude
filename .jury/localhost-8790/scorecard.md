# Voltitude (local build): jury score
Estimate, not affiliated with Awwwards. Independent critic subagent, from one page (landing plus the hangar and race screens) on 2026-11-02. The jury capture script timed out under software WebGL, so the critic got GPU captures taken by the builder: no hover pairs, keyboard-focus, reduced-motion or LCP/CLS data.

**The idea, as the critic read it:** a browser racing game whose menu is a 3D hangar (in-world screens and floor pads), driving a flying electric supercar, a fan project.
**Critic overall: 7.3** (0.4 × 7.5 Design + 0.3 × 6.5 Usability + 0.2 × 8 Creativity + 0.1 × 7.5 Content)
**Jury estimate: about 8.4** (critic + 1.1, from calibration.md)
**Band, from the estimate:** Site of the Day range. Caveat: the evidence set is thinner than a full crawl, and the builder chose the frames.

| Criterion | Score | Evidence |
|---|---|---|
| Design (40%) | 7.5 | d-01, d-02, d-06: one system of mark, wide face and red accent. d-03: pad labels crowded the borders (fixed after scoring). The d-02 detail panel is sparse. |
| Usability (30%) | 6.5 | d-02: clear key legend. d-07: the HUD enters without blocking. d-01: "READY" with no next step (an artifact of the capture, which held the loading screen; in the build it fades into the hangar). The legend is small. |
| Creativity (20%) | 8 | d-02 to d-05: a diegetic hangar menu with day and night variants and a tyre-warmer settings kiosk. |
| Content (10%) | 7.5 | Specific copy ("One card for everyone until 00:00 UTC"), fictional sponsors, an honest disclaimer. No pitch line on d-01. |

| Developer | Score | Evidence |
|---|---|---|
| Semantics/SEO | 4 | Audit WARNs: canonical, robots.txt, sitemap, 404 h1. Canonical and robots.txt were added after the audit; the sitemap and 404 depend on the host. |
| Animations/Transitions | 7 | d-07: staggered HUD entry. Hover and reduced-motion captures missing. |
| Accessibility | 5 | No axe data reached the critic (a11y-probe passed: 105 text elements at 4.5:1 or better). Small grey text in d-01 and d-02. |
| WPO | 7 | Page shell 153 KB (JS 20 KB gz, CSS 5 KB gz, fonts 125 KB). The 3D assets were not measured here (boot numbers are in progress.md 6.3). |
| Responsive | 6.5 | m-01 composed. m-02: the minimap is small and clipped near the top right. |
| Markup/Meta-data | 6 | No FAILs after the h1 and main fixes. |

## Fixes, most score first
1. [Usability] d-01: give the landing a next step. The real build fades into the hangar, but a first-time visitor on a slow link sits on the loading screen. Add a one-line pitch and "Loads straight into the hangar".
2. [Semantics] Sitemap and a designed 404, at deploy.
3. [Usability] d-02 and d-05: raise the key legend's size and contrast, and fill the sparse detail panel.
4. [Design] d-03: pad labels crowded the borders. Done after scoring.
5. [Responsive] m-02: minimap contrast and clipping on phone landscape.
6. [Accessibility] Run keyboard-focus and reduced-motion captures for the next pass.

## Measured
Audit: 0 FAIL, 4 WARN (before the canonical and robots fixes). Page shell 153 KB. a11y-probe: PASS. Not scored: motion feel, sound, FPS, LCP and CLS.
