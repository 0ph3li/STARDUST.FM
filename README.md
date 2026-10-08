# STARDUST.FM

> *my blood type is glitter and anxiety.*

**STARDUST.FM** is a concept website for a fictional **manifesting radio**: you type a wish, every letter flies into the sky and becomes a star, the stars connect into a constellation that's only yours, and the station prints you a certificate. Then it tunes you to the right frequency (a real radio, synthesised live in the browser), reads today's sky for your sign, and gives you posters to pin on your wall.

The look is the **"unplug" flyer**: flat hot pink, a photo sliced across a grid of squares, small tight grotesk type. The pixel grid is the motif of the whole site — in the hero, the sky, the radio cover, the posters, the loader and the page transitions.

Personal portfolio project · concept, design & code by **ghostly.grl** ♥

---

## Pages

| Page | File | What's inside |
|---|---|---|
| **Home** | `index.html` | *the flyer*: a pixel-grid portrait that assembles square by square, leans away from your cursor and comes apart as you scroll. **Make a wish**: type it, the letters jump out of the input and fly into a gridded night sky, land as stars, and the constellation draws itself; a **wish certificate** prints like a receipt (name, coordinates, brightness, expected arrival, your frequency, a barcode made of your words) and gets stamped *received*. **Soft frequencies**: a radio with seven stations you can actually hear, a dial you drag (static between stations), a cover that flashes on the beat and a live waveform. **Manifesto** where words come into focus as you read. **Today's sky**: twelve signs drawn as pixel constellations, a reading that types itself, your lucky frequency and a manifest-power meter. **Affirmation posters**: six flyers sliding sideways, tilting toward the pointer, with a *shuffle* button. **Spill some glitter**: hold anywhere to pour glitter that rolls and piles up on the floor (then sweep it). |
| **Make a wish** | `wish.html` | *dear universe, make a wish (properly this time)*: a pixel **star** made of a portrait that twinkles cell by cell and spins when you touch it, tonight's **moon phase** and a countdown to the next magic minute. **The wish composer**: a lined letter with a live **clarity** meter and five checks (present tense, specific, a feeling, no maybes, say what you want); **translate to manifest-speak** rewrites *i want to / i hope / i will* into the present and shows the diff; pick a category; **hold to seal** for three seconds and the letter folds into a seal that flies into the sky. **Your sky**: a world you **drag around** with inertia and a minimap, your wishes in pink and other listeners' in white; click a shape to open its certificate in a draggable window. **Seven rules of wishing** stacking up as you scroll. **Magic minutes**: a big clock, the next mirror minutes counting down (at 11:11 the page rains glitter). **A dandelion** you blow by moving fast over it. |
| **Radio** | `radio.html` | *the dial*: **drag anywhere** on the screen (or ← →) to tune across the whole FM band; let go near a station and it locks in. The cover is a **mosaic that sharpens as the signal locks** and fills with pink static between stations; signal bars, a giant pixel frequency. It opens on your wish's frequency (`radio.html?f=94.4`). **Sing along**: a pixel-square spectrum analyser and **affirmation karaoke** — each station's lines light up word by word on the beat. **The star grid**: a 16-step sequencer of squares in the key of the station, playing on top of the radio (and through the static); *play my wish* turns your last wish into a melody. **The station guide**: seven frequencies with a pixel icon that follows the cursor. **Your mixtape**: a cassette whose reels turn while you listen and whose tape moves from one side to the other; the J-card lists what you listened to the longest. |
| **Horoscope** | `horoscope.html` | *what's your sign, star?* A **zodiac wheel** of twelve squares around a pixel portrait: drag and flick it, it lands on a sign under the pointer; or type your birthday and it spins three times to yours. **The reading**: a text that types itself, love / money / glow / luck in squares, do and don't, lucky number, colour, frequency (links to the radio), best match and an affirmation — new every day. **The constellation reader**: join the stars in a gridded sky, close the shape if you like, and the reader interprets it (stars, loops, sharp angles, crossings, proportions), names it and finds which sign it looks like, tracing that sign over your drawing. **The week in squares**: seven columns of energy, a tip for each day. **The match**: pick two signs and a pixel heart fills with a photo as the percentage climbs. |
| **Privacy** | `privacy.html` | *what the stars remember*: a live count of what's stored on this device, then **the memory sky** — every `sd-` key drawn as a star (pink = kept, silver = this tab only); click one to read it in words and see its raw value, and **let it fall**. The same as a plain list. **The small print, in big print**: no server, no cookies or analytics, what the font/script CDNs see, the radio is maths not a microphone, your birthday is never saved, your own pictures stay in the tab, how to forget. **Hold for three seconds to forget everything** and every star falls. Linked from every footer. |
| **Posters** | `posters.html` | *print. pin. believe.* **The wall**: eight flyers taped to a pink grid wall that drop in when you arrive; drag them anywhere (they lean as they move, and stay where you left them), double-click one to load it into the studio. **The poster studio**: write the sentence (or use your last wish), pick a layout — *flyer* (the pixel grid), *mirror* (photo reflected with the words spread across), *blocks* (moka-style pink rectangles), *glitter* — a colour, any picture from the site or your own (it never leaves the browser), a new square shape; **download it as a PNG** or **pin it to the wall**. Every poster on the site is drawn by one canvas renderer, so the download is exactly the preview. **The affirmation machine**: a slot machine with three reels (*i attract · glitter · luck*), a lever, a jackpot that rains glitter, and a button that sends the sentence to the studio. **End of the broadcast**: tiles back to every room. |

---

## Motion

- **Smooth scroll** with Lenis, synced to ScrollTrigger.
- **Loader**: *tuning in…* a needle sweeps the whole FM band over pink TV static, the giant frequency counts with it, the signal locks on 88.8, the on-air light blinks and the page is revealed in vertical strips.
- **Strip transitions**: the page leaves in pink and ink bands dropping like a dial being turned, and arrives through the loader's strips.
- **Cursor**: a dot that grows into a label (*wish*, *tune in*, *read*, *tilt*, *hold*…); buttons are **magnetic**.
- **Glitter trail**: stars, hexagon flakes and dust fall out of the pointer; clicks burst.
- **Text**: headings slide up line by line out of a mask; kickers **scramble** into place.
- **Footer**: a scrolling **LED dot-matrix board** that lights up under your cursor; tonight's schedule with the slot on air highlighted; a **request line** whose dedication scrolls on the board.
- **Hero**: squares pop in at random, lean away from the pointer, and float off when you scroll.
- **Wish**: letters fly in an arc from the input to the sky, the constellation draws itself, the certificate prints in steps and gets stamped.
- **Radio**: the dial sweeps between stations (you hear the static), the cover grid flashes on the beat.
- **Posters**: pinned horizontal scroll with a progress bar; each poster swings in and its squares pop.
- **Tape**: speeds up and leans in the direction you scroll.
- **Nav**: hides when you scroll down, comes back when you scroll up; links roll over; the frequency in the nav moves as you scroll.

## Details

- **Pixel grids** — `<div class="pgrid" data-map="101/111" data-img="HOME/x.jpg">`: `1` = a square of the photo, `0` = empty. `S.pgrid(el)` builds it.
- **Images** — `img/HOME/` (`hero.jpg`, `radio.jpg`, `poster-1.jpg` … `poster-6.jpg`) `img/WISH/` (`hero.jpg`, `rules.jpg`, `outro.jpg`) `img/RADIO/` (`hero.jpg`, `radio.jpg`, `outro.jpg`) `img/HORO/` (`hero.jpg`, `match.jpg`, `outro.jpg`) `img/POSTERS/` (`hero.jpg`, `outro.jpg`) and `img/PRIVACY/` (`hero.jpg`). The photo is cropped like *cover* across the whole grid (`data-focus="x,y"` moves the crop). A missing image borrows `data-fallback` and keeps its label, marked *placeholder*.
- **Radio** — `js/radio.js`: pads, plucks, bells, bass and drums from oscillators and noise, a generated reverb and a tape delay. No audio files. `engine.voice()` and `engine.onSchedule` let the star grid play in time with the station.
- **Seeded skies** — the same wish always draws the same constellation; the horoscope changes every day.
- **Memory** — your wishes, your sign and the glitter on the floor are remembered on this device (`sd-` keys in localStorage). Nothing leaves your browser.
- **Reminders** — *remind me at 11:11* (in every footer, and ⏰ next to each magic minute on the wish page) downloads a calendar file (`.ics`, made in the browser) with a daily alarm at that minute; if you've made a wish, it's in the description. `S.remind('22:22')`, or any element with `data-remind="HH:MM"`.
- **Easter eggs** — tap the logo seven times; the Konami code starts a **meteor shower**; the console has `stardust.help()`; leave the tab and it misses you.
- **Access** — loops only run when their section is on screen, reveals have a failsafe, reduced motion turns the extra motion off.

---

## Design

**Palette** — flyer pink `#ff4fd8`, blush `#ffd9f0`, bubblegum `#f7a8c4`, raspberry `#7a1c47` (*can you feel it*), lime `#dcff45` (the little stars), navy `#1f2340` (*glitter and anxiety*), ink `#0d0c0d`, paper `#fffafd`.

**Type** — Inter Tight (the flyer grotesk), Instrument Serif italic (the soft voice), Pinyon Script (the signature), Space Mono (captions, certificates), VT323 (the frequency display).

**Moodboard** — `VIBES/`.
