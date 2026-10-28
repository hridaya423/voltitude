# Tesla Roadster (2nd generation): claims, demos, lore, and game abilities

Research date: 2026-10-27. Scope: what the next-gen Roadster is claimed or shown to do, for a flying racing game.

## 0. How to read this report

**Evidence grades.** Each claim carries one of these tags.

- **[P]** Primary: Tesla or Musk, as reported or relayed by outlets quoting them directly.
- **[R]** Reputable reporting that cites Tesla engineers or the event. Includes TechCrunch, NBC News, Fox News, Drive Tesla, Motor1, Electrek, Wikipedia (with its cited sources).
- **[S]** Secondary or low-authority aggregator. Treat as a lead, not a fact.
- **[U]** Unverified, speculative, or contradicted elsewhere.

**Access limits (be honest about these).**

- `tesla.com/roadster` returned HTTP 403. I could not read Tesla's own page or spec sheet.
- X (Twitter) posts could not be fetched directly. Every Musk or Tesla post below is relayed by an outlet. A quote appears in quotation marks only when a fetched article put it in quotation marks. I did not reconstruct any quote from memory.
- CNN (HTTP 451), Axios (HTTP 403) and Wikipedia's second half were not fully readable. No Verge, Car and Driver or 2026 Teslarati article surfaced in search.
- Page text was summarised by a small model before I saw it. Numbers that matter for balancing should be re-checked against the linked source.
- whereisroadster.com loaded with all live values at 0 (JavaScript data did not load), so I have no live position reading.

**Biggest finding.** The December-2025-era question ("will it fly?") has been answered by a real event. Tesla held a live reveal and demo on **2026-10-15** at SpaceX's McGregor, Texas test site. Everything below is split into the 2017/2018 claims and what was actually shown in 2026. **The 2026 numbers differ materially from the 2017 and 2018 numbers.**

---

## 1. Timeline

| Date | Event | Source |
|---|---|---|
| 2017-11-16/17 | Roadster unveiled at the end of the Tesla Semi event, Hawthorne airport, Franz von Holzhausen drove it out of a Semi trailer | [TechCrunch](https://techcrunch.com/2017/11/16/tesla-unveils-the-new-roadster/), [Fortune](https://fortune.com/2017/11/17/tesla-truck-200000-roadster) via search snippet [R] |
| 2018-02-06 | Falcon Heavy launches Musk's original Roadster with "Starman" | [Wikipedia](https://en.wikipedia.org/wiki/Elon_Musk%27s_Tesla_Roadster) [R] |
| 2018-06-09/10 | Musk tweets the "SpaceX option package" | [Electrek, 2018-06-09](https://electrek.co/2018/06/09/elon-musk-tesla-next-gen-roadster-spacex-package-rocket-thrusters/) [R] |
| 2021-02-11 | Rogan: "I want it to hover" | [Teslarati](https://www.teslarati.com/tesla-next-gen-roadster-hovering-joe-rogan-elon-musk-podcast/), [InsideEVs](https://insideevs.com/news/487498/elon-musk-talks-hovering-with-joe-rogan/) [R] |
| 2021-05-20 | Musk tweets 1.1 s with rocket option; Petersen museum plaque | [Electrek](https://electrek.co/2021/05/20/tesla-roadster-design-0-60-mph-1-sec-spacex-package/) [R] |
| 2024-02-28 | Musk says design goals "radically increased", 0-60 under 1 s target | [Wikipedia](https://en.wikipedia.org/wiki/Tesla_Roadster_(second_generation)) [R] |
| 2025-08-06 | Electrek reports a Tesla fan-car patent tied to the Roadster | [Electrek](https://electrek.co/2025/08/06/teslas-new-roadster-patent-doesnt-do-what-elon-said-it-would-and-thats-good/) [R] |
| 2025-10-31 | Rogan episode: demo "unforgettable", "crazier than anything James Bond" | [Electrek](https://electrek.co/2025/10/31/elon-musk-tesla-roadster-flying-demo/) [R] |
| Late 2025 to 2026-10 | Reveal slips: end 2025, then April 1 2026, then Oct 1 2026 (weather), then Oct 15 | [TechCrunch](https://techcrunch.com/2026/10/15/tesla-reveals-spacex-powered-roadster-that-flies-and-falls-with-style/) [R] |
| 2026-10-15 | Live reveal and demo, McGregor TX | see Section 5 |
| 2026-10-24 to 27 | Prototype displayed at Petersen Automotive Museum, LA; von Holzhausen drove it to a dinner on Oct 25 | [Tesla North](https://teslanorth.com/2026/10/26/tesla-roadster-petersen-dinner-von-holzhausen) [S] |
| Target 2028 | Production at Giga Texas, "Roadster Factory Texas" | [Drive Tesla](https://driveteslacanada.ca/news/tesla-roadster-specifications-new-details-2026/) [R] |

Event location and date wobble across outlets. TechCrunch and NBC say "near Waco". Fox, Not a Tesla App, Drive Tesla and Wikipedia say McGregor (a SpaceX test site near Waco). Date is Oct 15 (Thursday night US time) in most sources. NBC dates its article Oct 16. A Motor1 summary says "Wednesday night". Use **Oct 15, McGregor** as the working fact.

---

## 2. Historical claims (2017 to 2025)

### 2.1 The 2017 unveil spec ("base model")

All from the unveil. TechCrunch lists: 0-60 mph **1.9 s** (prototype; Musk said a production version might beat it), 0-100 mph **4.2 s**, quarter mile **8.9 s**, top speed **above 250 mph**, **200 kWh** pack, **630 miles** highway range (Reuters-via-Wikipedia says about 620 mi), four seats (2+2), price from **$200,000**, **Founders Series** of the first 1,000 units at **$250,000**, **$50,000 deposit**, availability **2020**. Musk is quoted: "This is the base model." Source: [TechCrunch 2017-11-16](https://techcrunch.com/2017/11/16/tesla-unveils-the-new-roadster/) [R].

Wikipedia adds (citing Tesla): **7,400 lb-ft (10,000 N·m) wheel torque**, three motors (one front, two rear) with torque vectoring, removable glass roof. I could not fetch the Tesla page that originally said this, so wheel torque and glass roof are [R] via [Wikipedia](https://en.wikipedia.org/wiki/Tesla_Roadster_(second_generation)). Musk's unveil-night quotes relayed by the search tool: "the fastest production car ever made, period", and a "hardcore smackdown to gasoline cars" [S]. A Tesla social post used "Going into plaid" [S].

### 2.2 The SpaceX package tweets (June 2018)

- **2018-06-09**, via [Electrek](https://electrek.co/2018/06/09/elon-musk-tesla-next-gen-roadster-spacex-package-rocket-thrusters/) [P/R], quoted verbatim by the article:
  - "SpaceX option package for new Tesla Roadster will include ~10 small rocket thrusters arranged seamlessly around car."
  - "These rocket engines dramatically improve acceleration, top speed, braking & cornering."
  - "Maybe they will even allow a Tesla to fly …"
- **2018-06-10**, via [AutoGuide](https://www.autoguide.com/auto-news/2018/06/elon-musk-serious-tesla-roadster-rocket-thrusters.html) [P/R]: "Note, gas contained would be ultra high pressure air in a SpaceX rocket COPV bottle."
- A further tweet reportedly said the system would use the "cold gas thruster system with ultra high-pressure air in a composite over-wrapped pressure vessel in place of the 2 rear seats." That wording reached me only through a search summary of an InsideEVs article, so treat the exact text as [S]. Wikipedia independently says the 2018 package put Falcon-9-style COPV tanks in place of the rear seats.
- A "10,000 psi" figure is attached to 2018 in Wikipedia. I found no 2018 primary source for it. The 10,000 psi number is solid only for the 2026 prototype (Section 5.3).
- **2018-09-07**: Wikipedia says Musk told Joe Rogan the thrusters "could make it fly". I did not retrieve the transcript. [U] for wording.

### 2.3 The 1.1 s claim

The "1.1 s 0-60 with the SpaceX package" claim appears with a Musk tweet on 2021-05-20 ("0 to 100 km/h in 1.1") and a Petersen Automotive Museum plaque ([Electrek](https://electrek.co/2021/05/20/tesla-roadster-design-0-60-mph-1-sec-spacex-package/), [InsideEVs](https://insideevs.com/news/508580/tesla-roadster-petersen-automotive-museum/)). On 2019-06-27 Musk tweeted that the base was **2.1 s** and the rocket option would improve it ([Wikipedia](https://en.wikipedia.org/wiki/Tesla_Roadster_(second_generation))). Jalopnik did the math and concluded about 30 kg of air would be needed just for the 1.1 s run ([Jalopnik](https://jalopnik.com/1847047575), via snippet) [S]. Note: the 1.1 s claim is **2021**, not 2018.

### 2.4 Rogan, 2021 and 2025

**2021-02-11 (hover):** [Teslarati](https://www.teslarati.com/tesla-next-gen-roadster-hovering-joe-rogan-elon-musk-podcast/) and [InsideEVs](https://insideevs.com/news/487498/elon-musk-talks-hovering-with-joe-rogan/) [R]. Quotes as relayed:

- "I want it to hover."
- InsideEVs also relays: "I'm trying to figure out how to make this thing hover, without, you know, killing people." and "So maybe it could hover, like, a meter above the ground, or something."
- Teslarati relays: "If we put a height limit on it, it will probably be fine."
- Asked whether it could travel while hovering: "Yeah". Teslarati paraphrases: pretty fast, subject to time limits. Musk wanted thrusters under the car. The design was not worked out. Musk said the car might not manage it.

**2025-10-31 (flight, demo hype):** [Electrek](https://electrek.co/2025/10/31/elon-musk-tesla-roadster-flying-demo/) [R]. Musk cited Peter Thiel's remark that the future was supposed to have flying cars. Asked whether the Roadster would fly, he said you would have to wait for the demo. He called the demo "unforgettable", said it had "a shot at being the most memorable product unveil ever", and said the car is "crazier than anything James Bond". Electrek's skepticism: a road-legal EV cannot fly today, and thrusters or fans could give a hop or brief hover at most.

Not found: a verbatim "Bond car" or "it will have rocket technology" quote from 2025. The "crazier than anything James Bond" line is the closest. The "rocket technology" phrasing came from a search-engine summary of 2021 coverage and is [U].

### 2.5 Patents

- [Electrek, 2025-08-06](https://electrek.co/2025/08/06/teslas-new-roadster-patent-doesnt-do-what-elon-said-it-would-and-thats-good/) [R]: Tesla patent for a "fan car" that pulls low pressure under the car to press it toward the ground, opposite to the "fly" idea. A side-skirt fan control concept is described by Futurism.
- A later Electrek piece described a second fan-car patent, **US 12,746,987 B1**, with four ducted fans in the rear diffuser and no ground-sealing skirts. Gadget Review gives a grant date of Sept 29, which I could not confirm. [S]
- Not a Tesla App cites **US 12,337,920 B1** (published 2025-08-05), "Vehicle air duct system for cooling and generating downforce" [S]. Whether this is the same filing as Electrek's is unclear.
- I found no Tesla patent covering the cold-gas thruster layout.

---

## 3. The 2026 reveal: what was shown (2026-10-15, McGregor TX)

Staged for a live audience at a SpaceX test site. Engineers from Tesla and SpaceX took part ([Fox News](https://www.foxnews.com/tech/tesla-roadster-flies-flips-hits-60-mph-flash), [TechCrunch](https://techcrunch.com/2026/10/15/tesla-reveals-spacex-powered-roadster-that-flies-and-falls-with-style/), [NBC News](https://www.nbcnews.com/tech/tech-news/elon-musk-shows-flying-tesla-roadster-years-delays-rcna603905), [Not a Tesla App](https://www.notateslaapp.com/news/4837/tesla-roadster-event-recap-it-flies-flips-and-hits-0-60-in-081s), [Euronews](https://www.euronews.com/2026/10/16/well-it-worked-elon-musk-unveils-new-tesla-roadster-that-can-fly)).

**Demo 1, inverted ramp.** The car climbed a curved half-loop ramp, held upside down by the fan suction system, left the end of the ramp, was rolled upright by thrusters, hovered briefly (Not a Tesla App; "no hover duration given"), and landed softly in a cloud of condensation. Fox News calls the ramp "large" and "curved". NBC says it was "shaped like half a roller-coaster loop". Tesla Oracle claims a ~68 ft jump and 3.2 G landing load [S]. I could not corroborate those two numbers elsewhere.

**Demo 2, "kickflip".** The car drove toward a line of Tesla vehicles (Cybercab, Cybertruck, Semi, Model Y, Model 3; NBC counts five), fired its thrusters to lift off, flipped in the air and landed. Lars Moravy is quoted: "Tony Hawk would be proud. We call that the kickflip." (Not a Tesla App). Tesla Oracle says the manoeuvre lasted about 3 seconds [S].

**Second run.** NBC reports a jump of about 27 feet "according to Tesla" with a barrel roll.

**Driver.** No human was inside. Musk said the car was technically driving itself, and gave this reason: "to make sure we don't kill anyone" (Not a Tesla App). He also said a purchasable car with this kind of stunt capability is planned, but "not sure it's necessarily legal in all jurisdictions" (Not a Tesla App). Wikipedia says a mannequin in a SpaceX spacesuit sat in the car [R, single source].

**Musk quotes, as relayed:**

- "We need an audience to prove that it's not AI or SI" ([Euronews](https://www.euronews.com/2026/10/16/well-it-worked-elon-musk-unveils-new-tesla-roadster-that-can-fly)).
- "Well, it worked" after the ramp stunt (Euronews, Not a Tesla App).
- The car has "altitude control thrusters and main thrusters in the rear, so it can basically fly like a rocket" (Euronews).
- "It can do rolls, it can do crazy gymnastics", and "not necessarily a safety optimised car" (Euronews). NBC's version: "not necessarily a safety-optimized car".
- Musk joked "This car really sucks" (NBC).
- Musk called it "the best of the last of the human-driven cars" (TechCrunch).
- Musk described the demo as the "most exciting, whether it works or not, demo ever of any product" (TechCrunch).
- Musk floated a Snake River Canyon jump (the Evel Knievel jump) as a test (TechCrunch, Not a Tesla App).
- Other fragments quoted by Not a Tesla App without context: "suck the chrome off a trailer hitch", "detach the retina", "Where we're going, you don't need tires." I could not see the surrounding sentence for any of these. Use cautiously.
- Pre-stunt: success "wasn't guaranteed" (several outlets; wording varies, one says "it will probably work").

**Safety.** TechCrunch says Musk said on an earlier podcast that safety "is not the number one goal", and that Tesla would aspire not to kill anyone in the car. Moravy said Rocket is not approved for public roads, and that Thrust is intended to be road-certified but its thrusters cannot be used on public roads ([Drive Tesla](https://driveteslacanada.ca/news/tesla-roadster-specifications-new-details-2026/)). Tesla also describes Rocket as for off-road use only (Wikipedia).

---

## 4. 2026 specs by trim, with conflicts

Tesla named three trims. Sources: [TechCrunch](https://techcrunch.com/2026/10/15/tesla-reveals-spacex-powered-roadster-that-flies-and-falls-with-style/), [Fox News](https://www.foxnews.com/tech/tesla-roadster-flies-flips-hits-60-mph-flash), [Not a Tesla App](https://www.notateslaapp.com/news/4837/tesla-roadster-event-recap-it-flies-flips-and-hits-0-60-in-081s), [Drive Tesla](https://driveteslacanada.ca/news/tesla-roadster-specifications-new-details-2026/), [EVXL](https://evxl.co/2026/10/16/tesla-roadster-everything-we-know/).

| | Performance ("road ready") | Thrust ("race ready") | Rocket ("air ready") |
|---|---|---|---|
| Seats | 2 | 2 | **1** |
| Aero | Active aero + suction fans | same | same |
| Thrusters | none | **4 rear** cold-gas | **10** total (4 rear + 6 more) |
| Tank | none | 200 L COPV | +400 L = **600 L** total |
| 0-60 mph (Tesla's launch post) | under 1.6 s | under 0.9 s | **under 0.59 s** |
| Reservation | $50,000 | $250,000 | invite only |
| Road status | road-ready | race-ready; thrusters not for public roads | not approved for public roads |

**Common claims.**

- Range: over 300 mi (Tesla). Moravy suggested 310 to 320 mi (Drive Tesla [R]). Versus 620 mi promised in 2017.
- Top speed: "over 230 mph" (Tesla, event). Conflicts: Moravy 214 mph for the prototype, von Holzhausen about 220 mph for the base car, Hagerty 210 mph (Performance) and 230 mph (Thrust), a 330 mph target with the pressure tank (Top Gear via EVXL). Musk's long-term aim is "half the speed of sound", reported as about 383 mph (NBC, Motor1) and in a later X post as "~400 mph" (Electron Motion). Aspirational, [U].
- Power: more than 1 MW, 1,341 hp (Moravy); about 1,500 hp (Moravy to others, MotorTrend). Torque above 1,400 Nm (Hagerty) or 1,348 Nm (MotorTrend). **This replaces the 2017 "10,000 N·m at the wheels" claim**, which is a different measure (wheel torque after gearing) and is not comparable.
- Layout: rear-wheel drive, two rear motors, no differential (EVXL). 2017 was three motors AWD.
- Battery: custom 4680 cells (Drive Tesla). Capacity undisclosed. MotorTrend says "well over 100 kWh". Electron Motion quotes von Holzhausen at 115 kWh [S]. 2017 was 200 kWh.
- Charging: above 500 kW on a V4 Supercharger, roughly 10 to 80 percent in about 10 minutes (Moravy and others, variants differ) [R/U].
- Weight: target just under 1,700 kg / 3,700 lb.
- Wheelbase: 2,825 mm (Wikipedia). Width about 79 in (EVXL via Sawyer Merritt) [S].
- Wheels and tires: 20 in front, 21 in rear, Pirelli P Zero Trofeo RS 295/30 and 335/30 (EVXL via a Top Gear walkaround note) [S].
- Roof: glass roof panels stow in the trunk for a T-top (EVXL); Hagerty mentions removable roof panels (search snippet). Dihedral doors (Tesla North, from Sawyer Merritt video) [S]. Pop-down headlight modules; by-wire steering yoke; by-wire brakes and throttle; fixed seat bases; microsuede headliner [S/R].
- Price: none announced. TechCrunch: Musk gave no price. The last official base price was $200,000 in 2017.
- Reservation terms: Performance $5,000 by card + $45,000 within 10 days; Thrust $5,000 + $245,000 (Fox News). Terms say a reservation holds an approximate place in line, not a completed order. Tesla says the Roadster "remains under development" with no guarantee of delivery (Fox News).

**Acceleration conflict (0-60 mph).**

- 0.81 s on stage (Tesla; Fox, NBC, Not a Tesla App). Detroit News per EVXL: "Thursday".
- Under 0.59 s is the Rocket **target**, not a measurement (Tesla launch post).
- Moravy told Hagerty 0.55 s with rollout subtracted; one analyst (Catchpole, via EVXL) estimates about 0.85 s for Thrust in standard timing.
- TechCrunch says Tesla "showed" one second. Euronews says a display showed under one second.
- A Fox News passage says the 0.81 s run was in a "thruster-assisted" prototype. The coverage does not fully pin down which trim ran it. Do not treat 0.81 s as a Performance figure. It is an event run with thrusters and suction.

---

## 5. How the system works (as stated)

### 5.1 Fan suction system ("the sucker")

- Moravy: a "fan suction system" on the underside "can pull up to 2 Gs in order to make the car go upside down" ([Euronews](https://www.euronews.com/2026/10/16/well-it-worked-elon-musk-unveils-new-tesla-roadster-that-can-fly), Drive Tesla, Motor1). Tesla claims cornering above 2 G versus about 1.26 G from tires alone (Not a Tesla App).
- Four rear fans, about 20 kW each (about 80 kW total), reportedly derived from the Model 3 heat pump compressor motor (Electron Motion, citing Moravy). Detroit News counted two fans; Tesla photos show four (EVXL). Treat four as best-supported.
- Four independent drop-down skirts seal the underbody (rubber with nylon bristles, replaceable) (Electron Motion citing Hagerty).
- Modes: below roughly 50 mph, fans hold more than 2 G in corners. Above about 200 mph, skirts open and the fans draw a high-flow venturi under the car (Electron Motion citing Moravy). Downforce works at zero speed.
- Active aero: two aero modes (High-Downforce, Low-Drag). Rear wing deploys for traction and stows for speed, with Optimus-derived actuators. The rear wing can tilt about 90 degrees as an airbrake (MotorTrend via EVXL). Front wing leading edges tilt up to 80 degrees. Track Mode lowers the car 40 mm and stiffens it about 3x (EVXL) [R/S].
- Suction is also used to drive up the inverted ramp, since the car clings to the surface.

### 5.2 Cold-gas thrusters (SpaceX-derived)

- Cold gas: pressurised gas released through nozzles. No combustion.
- Rocket count: **10 nozzles**. Layout per Moravy via MotorTrend/Top Gear (EVXL, Electron Motion, Tesla North): 4 rear nozzles (Thrust) plus 6 on Rocket, which are **one behind each wheel pointing down** and **2 at the nose for yaw**. The rear nozzles are visible as gold-lined nozzles above the diffuser (EVXL). Tesla Oracle describes them as "bottom, sides, and rear" [S]. Tesla says thrusters give forward, upward, sideways and rotational movement (Tesla North citing Tesla) [S].
- Thrust: "over 80 kN" from the four rear thrusters during the 0-60 run (Moravy; Electron Motion says compared to one F-16 engine without afterburner). Tesla rates thrust at 4 to 5 times the force the tires can deliver (Electron Motion citing Tesla).
- Moravy's lift claim: with a deliberately high 2,500 kg total mass, 80 kN is over three times the vehicle mass, leaving "spare air to flip" ([Tesla North](https://teslanorth.com/2026/10/22/tesla-roadster-flying-moravy-simple-math/)).
- Duration: one full fill gives about **5 seconds of thrust**, mostly early in a quarter-mile run, tapering as the tank empties (Moravy to Top Gear, per Electron Motion). Per-nozzle thrust and total flight time are **not** published.
- Valves: driven by an Optimus-derived actuator, equal-length Inconel and titanium pipes, left and right valves controlled separately (a 10% mismatch would cause a spin) (Electron Motion citing MotorTrend) [S].
- Exhaust: supersonic, visible shock diamonds, a harmless condensation cloud (Moravy comment as relayed).

### 5.3 Tanks, gas and refill

- Thrust: one 200 L COPV in the trunk, rated to 10,000 psi. Rocket adds a 400 L COPV where the passenger seat would be (600 L total, about 250 kg of gas per Not a Tesla App). On-screen readout in Tesla's interface video showed **5,500 PSI** in track mode (Tesla North, EVXL). Which number applies in use is unclear.
- Tesla's X post said "every usable void" holds COPVs (TechCrunch).
- Gas: Moravy says nitrogen (EVXL, Electron Motion). Musk said the car refills its own high-pressure air (NBC: "self-refilling"; TechCrunch: "the air tank can be recharged"; Not a Tesla App: "recharges its own air tanks"). **Unresolved conflict**: Moravy describes a station fill. Refill times reported: 2 to 6 hours (InsideEVs via Electron Motion), 6 to 7 hours (Hagerty), with a target near 30 minutes.
- Gas is relayed as nitrogen in some outlets and "compressed air" in others (TechCrunch). Moravy quote to Hagerty favours nitrogen.
- Thrust 4 rear nozzles and Rocket 10 nozzles are also described as "single-use thruster system with one launch per refill" by EVXL. That is the author's reading, [U].

### 5.4 Safety-relevant design

- Replaceable skirt wear parts, high-pressure tank. COPV is the vessel type linked to past SpaceX rocket anomalies, noted by TechCrunch.
- Demos were uncrewed or autonomous.
- Rocket not approved for public roads.

---

## 6. Status as of late October 2026

- Production target **2028** (Musk). Four or five development prototypes exist, with a bigger build "early next year" (Moravy via EVXL). Building at Giga Texas.
- Not final: price, pack size, final weight, top speed per trim, FSD restrictions, refill method, body material (EVXL).
- Public display: Petersen Automotive Museum, Oct 24 to 27, 2026 ([Tesla North](https://teslanorth.com/2026/10/26/tesla-roadster-petersen-dinner-von-holzhausen) [S]).
- Skeptic voices: Marques Brownlee asked whether the claims were a prank (TechCrunch). Motor1 and EVXL stress company claims from a single staged event, with no customer car for verification.
- Musk says the Roadster will be the only manually driven car Tesla makes (Not a Tesla App).

---

## 7. Visual and audio identity

**Visual (2026 prototype).**

- Colour: **Ano White**, an aerospace-derived finish said to resist UV, cold and corrosion (Not a Tesla App, EVXL). TechCrunch says "stark white". The only colour I found.
- Glass: orange/gold tint called "Gold Glazed", described by Moravy as titanium oxide glass (EVXL).
- Shape: low, angular wedge compared to a Lamborghini and to the Lotus Esprit from *The Spy Who Loved Me*; Musk owns that Lotus and it was displayed at the event (TechCrunch). Tesla cites SR-71 and F-35 as inspiration; von Holzhausen cited transforming vehicles.
- Lights: full-width rear light bar (red, EVXL) and a full-width bar at the nose. Pop-down headlights. License plate "RDSTR" (EVXL).
- Exposed rear diffuser housing the fans and thruster nozzles (Not a Tesla App).
- Dihedral doors.
- Interior: steer-by-wire yoke with about 170 degrees travel each way, two seats molded into the chassis, microsuede headliner.
- Stage visual: Roadster hung inverted on the arch, compared to Spider-Man on a ceiling; Starship-style flight counters on screens (Tesla Oracle) [S].

**Sound.** No credible description of the 2026 car's sound surfaced. Tesla Oracle says it does not describe sound. Safe, grounded sonic cues for a game, labelled as design inference:

- Electric motor whine and inverter sound from a 1 MW rear drive.
- Fan whine from four 20 kW fans spinning up (fans at about 15,000 rpm, Electron Motion via Moravy).
- A sharp hiss/roar from supersonic gas through the nozzles, with a visible condensation cloud and shock diamonds.
- Rubber/bristle skirt scraping.
- Condensation puff on landing.

**Tesla marketing tags** (relayed by Tesla Oracle, low-authority): "Real life, baby", "Do a kickflip!".

---

## 8. Starman and the 2018 Falcon Heavy Roadster

Core source: [Wikipedia: Elon Musk's Tesla Roadster](https://en.wikipedia.org/wiki/Elon_Musk%27s_Tesla_Roadster) [R], plus [collectSPACE](https://www.collectspace.com/news/news-020718a-spacex-falcon-heavy-roadster-easter-eggs.html) [R] for attributions.

**Launch.** 2018-02-06, 20:45 UTC, Falcon Heavy test flight, pad LC-39A, Kennedy Space Center. The car replaced a boilerplate mass simulator. The upper stage reached Earth parking orbit, coasted about six hours through the Van Allen belts, then burned again to an escape trajectory. The live stream ended after about four hours, before the last burn. Musk had estimated the battery would last over 12 hours. The car is a 2008 cherry-red Roadster, which Musk called a "midnight cherry Tesla Roadster" in a 2017-12-02 tweet.

**Easter eggs (with attribution).**

| Item | Detail | Source |
|---|---|---|
| Starman | Mannequin in a SpaceX pressure suit, one hand on the wheel, elbow on the sill. Named for Bowie's "Starman". Musk on the suit: "That is the real deal." | collectSPACE |
| Music | Stereo set to loop Bowie's "Space Oddity" | Wikipedia |
| Dash screen | "DON'T PANIC!" | Wikipedia, collectSPACE (Musk tweet pre-launch: "a sign saying 'Don't Panic.'") |
| Glove box | A copy of *The Hitchhiker's Guide to the Galaxy* and a towel | Wikipedia; Musk confirmed on Twitter before launch (collectSPACE) |
| Circuit board | Etched "Made on Earth by humans" | Wikipedia; Musk posted it on Instagram (collectSPACE) |
| Dashboard | Hot Wheels miniature Roadster with a tiny spaceman, suggested by a friend of Musk. Musk: "On the dashboard, there's a tiny Roadster with a tiny spaceman." | collectSPACE |
| Plaque | Names of more than 6,000 SpaceX employees on the payload attach fitting | collectSPACE |
| The Arch | Quartz/5D optical disc from the Arch Mission Foundation holding Asimov's *Foundation* trilogy | Wikipedia, collectSPACE (stated on the webcast by Lauren Lyons) |

One outlet (geo.tv) put "Made on Earth by humans" on a license plate. Every better source says circuit board, so treat that as an error.

**Orbit.** Heliocentric, epoch 2018-05-01 (Wikipedia): eccentricity 0.25571, perihelion 0.98613 au, aphelion 1.6637 au (reached 2018-11-09), inclination 1.077 degrees, period 1.525 years (about 557 days), peak speed about 121,000 km/h at perihelion. It crosses Mars's orbit but cannot encounter Mars. First Mars close approach 2020-10-07 at about 8 million km. First solar orbit completed about August 2019. Next Earth approach 2047 at about 5 million km. In a 3-million-year simulation: about 6% chance of Earth impact, about 2.5% Venus. Radiation will degrade the car, with tires, paint and leather lasting about a year and the aluminium frame longest. Brightness data give a spin period of about 4.76 minutes. Spacecraft passivated, so no telemetry. Musk said in August 2019 that SpaceX might one day retrieve or photograph it.

**Where is it now.** Live position could not be read (see Section 0). Rough derived value: 2018-02-06 to 2026-10-27 is about 8.72 years, divided by 1.525 years per orbit gives **about 5.7 orbits completed** (my arithmetic, [U] for exact count). A low-authority blog says about 5.5 as of July 2026. Tracker: [whereisroadster.com](https://www.whereisroadster.com/) (unaffiliated with Tesla, SpaceX or Musk, launched 2018-02-07 per Wikipedia). For authoritative state vectors use JPL Horizons, designation 2018-017A.

---

## 9. Game-relevant abilities

Mapping rule: use the real claim as the fiction, then tune for fun. Real numbers are anchors, not requirements.

**Real anchors a game can quote:**

- 10 cold-gas nozzles: 4 rear (main), 4 downward at the wheels (lift), 2 at the nose (yaw).
- 80+ kN peak thrust, about 5 s of thrust per 200 L fill, 600 L total on Rocket.
- Fans: 4 x 20 kW, up to 2 G downforce, works at standstill.
- Two aero modes: high-downforce and low-drag, with an air-brake wing.
- 1 MW drive, 0.81 s (shown) to 0.59 s (target) 0-60 mph, 230+ mph.

| Ability | Real claim it maps to | Grade | Mechanic |
|---|---|---|---|
| **Rear boost** | 4 rear cold-gas nozzles, 80 kN, "dramatically improve acceleration" (2018 tweet), 5 s per 200 L | [P/R] | Limited-burst forward boost drawn from a pressure gauge. Peak thrust at full tank, tapering as it empties (Moravy). |
| **Gas pressure and refill** | COPV tanks (5,500 vs 10,000 psi on screen), refill 2 to 7 h today, target 30 min, "car refills itself" (Musk) | [R], conflict on method | Pressure gauge HUD. Passive recharge on the ground, faster with a "pit fill" pickup or compressor. Gate refill speed by the Musk vs Moravy conflict: self-refill is Musk's claim, station fill is the engineer's. |
| **Fan suction grip** | 4 fans, up to 2 G, works at zero speed, skirts, venturi at 200+ mph | [P/R] | Hold-to-stick downforce. Raises cornering grip, drains energy. Allows driving on walls and ceilings and upside-down loops (the ramp demo). |
| **Wall and loop driving** | Inverted half-loop ramp demo | [P/R], demonstrated | Track sections with ceilings and loops that need fans on and enough speed. |
| **Down-thrust hop** | Down-pointing thrusters behind each wheel; kickflip over five vehicles; ~27 ft jump (NBC) or ~68 ft (Tesla Oracle [S]) | [R] | Short jump with a tank cost. Height scales with pressure. |
| **Attitude control / air flips** | 2 nose yaw thrusters, left/right valves separate, "spare air to flip"; Musk "rolls ... crazy gymnastics" | [R] | Mid-air rotate and flip for trick score. Air-roll with a left/right bias. 10% valve mismatch causes a spin, so unbalanced inputs spin you. |
| **Lateral dodge / strafe** | "Forward, upward, sideways and rotational movement" (Tesla via Tesla North [S]); 2018 tweet says thrusters improve cornering | Cornering benefit [P 2018]; sideways thrust on 2026 car [S] | Short air-dodge sideways or cornering assist. Mark sideways thrust as inferred: the nozzle layout in [R] sources has no explicit sideways nozzles. Side-thrust nozzles are inferred, not shown. |
| **Braking thrust** | 2018 tweet: thrusters improve "braking"; rear wing tilts about 90 degrees as airbrake (MotorTrend via EVXL) | Tweet [P]; wing airbrake [S] | Air-brake from the wing is grounded. Reverse thrust is **not** supported by any 2026 nozzle layout (rear nozzles point backward for forward thrust). Rocket-assist braking is a 2018 tweet only. |
| **Controlled hover** | 2021 Rogan "a meter above the ground"; brief hover in the Oct 2026 ramp demo (Not a Tesla App); 80 kN vs 2,500 kg ≈ 3.3x lift (Moravy) | Brief hover [R, one source]; sustained hover [U] | Brief hover-hold with a height cap, burning pressure fast. My inference: 5 s per 200 L suggests hover is seconds, not minutes. |
| **Launch start** | 0.81 s 0-60 (event); thrusters 4 to 5 x tire force | [P/R] | Standing-start burst. Wheelspin-free launch, cost a chunk of gas. |
| **Aero modes** | High-Downforce / Low-Drag; active rear wing; front wing to 80 degrees | [R] | Toggle for corners vs straights. Air-brake. Low-drag for top speed. |
| **Track Mode suspension** | Lowers 40 mm and stiffens ~3x | [S] | Slam-to-ground stance, better handling, worse landing bounce. |
| **Landing control** | Downward thrusters used for soft landings; 3.2 G max landing load (Tesla Oracle [S]) | [R/S] | Landing burst reduces fall damage if timed; late burst drops hard. |
| **Condensation cloud** | Visible cloud on landing, shock diamonds | [R] | VFX cue on thrust. Also a readable signal to other racers. |

**Suggested game structure grounded in real constraints.**

- Primary resource: gas pressure (shared by boost, hop and flip). Secondary: battery (for fans and drive). This mirrors Tesla's own two systems.
- Ground-first: fans are always available, so flying is something you earn by spending gas. Matches Moravy ("spare air to flip") and the 5 s limit.
- Variants: Performance (no gas), Thrust (rear boost, small tank), Rocket (full 10 nozzles, large tank, single seat). A natural progression or car-class system.
- Narrative anchors: Starman, "DON'T PANIC", "Space Oddity", "Made on Earth by humans", the Hot Wheels Roadster, Evel Knievel jump ("Snake River" as a finale ramp), the Spy Who Loved Me Lotus (Bond-car callback).

**Speculative or unsupported (mark in design docs).**

- Sustained flight or hover for more than a few seconds: no source. Moravy gave no flight time. [U]
- Free hover at altitude: Musk 2021 said "a meter"; 2026 demos showed jumps and flips, not stable hover. [U]
- Reverse-thrust braking and sideways strafe nozzles: not in the described nozzle layout. [U]
- 383 to 400 mph top speed: Musk's aspiration. [U]
- 0.59 s 0-60: a Tesla target. [U]
- 68 ft jump and 3.2 G landing: one low-authority source. [S]
- Nitrogen vs air, self-refill vs station fill: contradictory statements. [U]
- Sounds of the thrusters: none documented. Design from physics.

---

## 10. Source index

Primary-ish (Tesla, Musk, relayed):

- Tesla Roadster page: https://www.tesla.com/roadster (could not load, HTTP 403)
- Musk 2018 tweets, via [Electrek 2018-06-09](https://electrek.co/2018/06/09/elon-musk-tesla-next-gen-roadster-spacex-package-rocket-thrusters/) and [AutoGuide](https://www.autoguide.com/auto-news/2018/06/elon-musk-serious-tesla-roadster-rocket-thrusters.html)
- Rogan 2021, via [Teslarati](https://www.teslarati.com/tesla-next-gen-roadster-hovering-joe-rogan-elon-musk-podcast/) and [InsideEVs](https://insideevs.com/news/487498/elon-musk-talks-hovering-with-joe-rogan/)
- Rogan 2025-10-31, via [Electrek](https://electrek.co/2025/10/31/elon-musk-tesla-roadster-flying-demo/)

Reputable reporting:

- [TechCrunch 2017](https://techcrunch.com/2017/11/16/tesla-unveils-the-new-roadster/), [TechCrunch 2026](https://techcrunch.com/2026/10/15/tesla-reveals-spacex-powered-roadster-that-flies-and-falls-with-style/)
- [NBC News](https://www.nbcnews.com/tech/tech-news/elon-musk-shows-flying-tesla-roadster-years-delays-rcna603905), [Fox News](https://www.foxnews.com/tech/tesla-roadster-flies-flips-hits-60-mph-flash), [Euronews](https://www.euronews.com/2026/10/16/well-it-worked-elon-musk-unveils-new-tesla-roadster-that-can-fly), [Motor1](https://www.motor1.com/news/812195/tesla-roadster-stunt-2028-production/)
- [Wikipedia: Tesla Roadster (second generation)](https://en.wikipedia.org/wiki/Tesla_Roadster_(second_generation)), [Wikipedia: Elon Musk's Tesla Roadster](https://en.wikipedia.org/wiki/Elon_Musk%27s_Tesla_Roadster)
- [collectSPACE](https://www.collectspace.com/news/news-020718a-spacex-falcon-heavy-roadster-easter-eggs.html)
- [Electrek patent piece, 2025-08-06](https://electrek.co/2025/08/06/teslas-new-roadster-patent-doesnt-do-what-elon-said-it-would-and-thats-good/)

Technical aggregators (cite Top Gear, Hagerty, MotorTrend interviews with Moravy and von Holzhausen; I did not read the originals):

- [Drive Tesla specs piece](https://driveteslacanada.ca/news/tesla-roadster-specifications-new-details-2026/), [Drive Tesla 80 kN piece](https://driveteslacanada.ca/news/tesla-roadster-thrusters-production-lars-moravy-80kn/)
- [Not a Tesla App event recap](https://www.notateslaapp.com/news/4837/tesla-roadster-event-recap-it-flies-flips-and-hits-0-60-in-081s)
- [EVXL](https://evxl.co/2026/10/16/tesla-roadster-everything-we-know/), [Electron Motion](https://electronmotion.com/2026/10/17/tesla-roadster-thrusters/), [Tesla North (Moravy)](https://teslanorth.com/2026/10/22/tesla-roadster-flying-moravy-simple-math/), [Tesla North (Petersen)](https://teslanorth.com/2026/10/26/tesla-roadster-petersen-dinner-von-holzhausen), [Tesla Oracle](https://www.teslaoracle.com/2026/10/15/tesla-stuns-the-world-with-the-flying-roadster-stunts-videos-learn-how-it-works/)

Recommended follow-ups before locking numbers: read Tesla's page and launch X post directly, the Hagerty, Top Gear and MotorTrend originals, and re-pull whereisroadster or JPL Horizons for the live position.

---

## 11. Summary (10 lines)

1. The Roadster did fly-ish on 2026-10-15 at SpaceX's McGregor site: inverted-ramp drive, thruster roll, brief hover, landing, then a "kickflip" over five Teslas. It was driverless.
2. Trims: Performance (no thrusters, under 1.6 s), Thrust (4 rear nozzles, 200 L, under 0.9 s, $250k reservation), Rocket (1 seat, 10 nozzles, 600 L, under 0.59 s, invite only, not road legal).
3. Shown 0-60 was 0.81 s. Top speed claims range 210 to 230+ mph now, with 330 to 400 mph as aspiration. Range is 300+ mi, not 620.
4. Thrust claim: 80+ kN (about 5 s per fill); fans give up to 2 G suction at standstill, so the car sticks to ceilings.
5. 2018 "SpaceX package" tweets are verbatim: about 10 thrusters, better acceleration, top speed, braking and cornering, "Maybe they will even allow a Tesla to fly". The 1.1 s claim is from 2021.
6. Hover talk: Rogan 2021 ("I want it to hover", about a meter), Rogan 2025-10-31 ("unforgettable", "crazier than anything James Bond"). No source gives a sustained hover time.
7. Refill and gas are contested: Musk says self-refilling, Moravy says nitrogen from a station (2 to 7 hours today, goal about 30 min). Production 2028, price unannounced.
8. Visuals: Ano White, angular wedge, full-width light bars, gold nozzles above the diffuser, dihedral doors. No documented sound. Sound design must be inferred from physics.
9. Starman lore: Falcon Heavy 2018-02-06, "Space Oddity", "DON'T PANIC!", Hot Wheels Roadster, Hitchhiker's Guide plus towel, "Made on Earth by humans", Arch with Foundation trilogy; period 557 days, about 5.7 laps by my arithmetic.
10. Game mapping: shared gas-pressure resource with rear boost, down-thrust hop, flip control and brief hover; fans as ceiling-grip; reverse-thrust braking and sideways strafe are not backed by the real nozzle layout and should be flagged speculative.
