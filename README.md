# Timbuhtuk — Personal space

**[Open the card](https://timbuhtuk.github.io/personal-card/)**

A personal link card with procedural contour figures, Game of Life bands and an interactive name that disperses into triangular fragments.

“Solved before you knew it was a problem.”

The page uses self-hosted Science Gothic and Cascadia Code fonts with Tessera design tokens. It has no external runtime dependencies or build step. Reduced motion keeps the name solid and pauses the artwork; animation also stops while the tab is hidden.

The browser's `prefers-color-scheme` selects the existing dark Contrast palette or Tessera Storybook's warm Light palette. CSS selects the theme before the first paint, including without JavaScript. Changing the browser preference updates the artwork, Life colors, name textures, About icons and transition ink without reloading or reseeding the simulation. An active entrance or page transition settles safely when the theme changes. The pixel cursor and click rings invert against the surface underneath them to remain visible on either palette.

The same automatic palette applies to Work (including its embedded frame), all three study pages and the saved pier card. Work labels, technology icons, dividers and preview borders follow the palette; screenshots and banner artwork retain their original appearance. Study controls, selected states, logo studies and transition contours adapt as well. The saved card retains its original composition and frozen layout, with a shared theme override for its surrounding page.

One to three figures start at random positions, with curved pressure boundaries and 32 px contour spacing. Strokes are 1.3 px thick. The gap between neighboring figures follows the same 32 px spacing. Contours continue into the center instead of stopping at a fixed layer count. The logical scene is bounded to 1920 × 1080 and compensates for zooming out below one device pixel per CSS pixel. Its supersampled buffer stays within 8 million pixels and 4096 pixels per side, including at 25% browser zoom. Resize and pixel-density changes rebuild the scene. Geometry runs in a worker; each new mesh is drawn once. On viewports up to 767 px wide, or devices whose primary input is a coarse pointer with no hover, the contour background is static: it builds once and rebuilds only when resized. Desktop motion resumes from the same contour phase when the media condition changes. Life bands and the name retain their own interaction and animation. Supersampling smooths the strokes while the Life cells stay crisp. Hovering or clicking the name scatters its fragments, which return when the pointer leaves. A cached triangular wireframe remains in the original letter shapes beneath the moving fragments.

The name, slogan and account links stay centered at every screen width. The buttons open [GitHub](https://github.com/Timbuhtuk), [LinkedIn](https://www.linkedin.com/in/tymofii-pankovskyi-2827bb331/) and [Telegram](https://t.me/timbuhtuk). On small screens the links wrap to keep the labels and logos readable. Button hover effects require a viewport wider than 600 px and a fine pointer that supports hover; keyboard focus remains visible on every device.

The main page opens with **Hybrid+**: the name is outlined and filled, then a split reveal opens the page while contour strokes draw into place. The 2.85-second entrance starts after the document, fonts, triangle atlas and first contour frame are ready. Resize or reduced motion settles it immediately; hiding the tab pauses it and returning resumes it. Temporary canvases and listeners are released at the end. If preparation fails, the card remains accessible; without JavaScript it is visible immediately.

## Local preview

Run `node server.cjs`, then open `http://localhost:6007/`.

## Entrance studies

Open `entrance-lab.html` to compare six entrance animations on the actual card: Impulse, Gravity, Plotter, Split, Hybrid and Hybrid+. Hybrid uses Plotter's outlined-name sequence, then opens the background and other content with Split's reveal; use `?variant=hybrid` to open it directly. Hybrid+ adds Plotter's progressive contour strokes during the opening; use `?variant=hybridTrace`. Plotter, Split and the original Hybrid remain available individually. The main page uses Hybrid+ without any preview controls. The preview and main page share the same animation renderer. The preview waits for the document, fonts, triangle atlas and first contour frame before starting. It has replay, pause, half-speed and timeline controls; each variant can be linked with its name. During playback the existing simulation is frozen, then resumes after the scene settles. Reduced motion skips automatic playback; the timeline still allows inspecting individual frames. Resizing settles the scene so a replay can use its new dimensions.

## Cursor studies

The main page uses the selected **10 Signal** pixel cursor with the circular click echo from Elastic. It has no movement trail, and its frame loop stops when idle. Touch, keyboard navigation, reduced motion and a missing canvas preserve normal controls; the custom cursor stays inactive during the entrance animation.

Open `cursor-lab.html` for four shortlisted cursor concepts on the actual card: 01 Elastic, 02 Shards, 07 Reticle and 10 Signal. The original numbers stay in place for comparison. Signal keeps the pixel cursor without a movement trail, plus the same circular click echo as Elastic. The selector supports keyboard input and direct `?cursor=signal` links; the system-cursor button restores native behavior. Effects stop when idle or hidden, are bounded in size, and use static previews for reduced motion. Touch devices keep native controls. These studies do not load on the main page.

## Page transition studies

Open `transition-lab.html` for the selected 06 Diagonal cut and 07 Contour portal, followed by ten related studies numbered 11–20: Twin blade, Chevron, Cross incision, Liquid seam, Zipper, Contour eye, Diamond gate, Twin portals, Contour tide and Spiral iris. Other original transition concepts have been removed. The ten new options reveal the actual page through animated vector masks and boundary contours. `?transition=eye` opens a particular study.

Selecting a concept previews Home to About; use Back to home for the other direction. Replay, pause, half speed and a frame slider remain available. Liquid seam (14) plays its opening in reverse when returning home: the About aperture closes toward the center over the fully visible home page. The two Life bands stay in place. Switching concepts cancels the current scene, resizing settles its target, hidden tabs pause and resume, and reduced motion skips autoplay while retaining manual frame inspection. The main page keeps its existing transition.

Run `node transition-motion.test.cjs` and `node transition-lifecycle.test.cjs` for mask coverage, finite contours, both directions and preview lifecycle checks.

## About

The underlined “work” link opens Selected Work at `#work` with the same 1.7-second Liquid seam rotated by 90 degrees: the edges run horizontally and open up and down. The centered Home link below the project list and Browser Back play the exact reverse. The Work heading is centered, with no masthead or decorative microcopy; project rows retain names, technology icons and previews. The current project index is reused in a same-origin frame, loaded on link intent and revealed after its content and fonts are ready; no project images are fetched during the initial Home load. Browser history, direct `#work`, keyboard focus, reduced motion, resizing and loading failure are supported. Life remains outside the reveal; covered contours pause on Work and continue smoothly during either transition. The standalone `work-lab.html` remains the link fallback.

Work lists Tessera, Sonar, Between Two Worlds, SIDEQUEST and Kvasir. Fine-pointer hover and keyboard focus show a floating preview; small screens display previews inline. Sonar uses real application screens, Between Two Worlds uses gameplay captures, and SIDEQUEST uses its homepage, library and TF29 map. Tessera compares a monochrome original mural on the left with its color pixel result on the right, separated diagonally over two actual editor screenshots. The previous pier composition remains available separately at `tessera-card-pier.html`, with its styles and assets preserved. Material provenance is stored alongside the preview assets.

Kvasir uses a detailed overhead turntable concept with an iris-textured green vinyl record, generated from the bot avatar and the supplied hardware reference. The optimized WebP banner retains separate title and shading layers. Earlier artwork candidates and exact prompts remain in `dist/assets/work/kvasir/`.

The “me”, “work” and Home links animate their underline on hover; Home also nudges its small outward arrow. Hover effects require a fine pointer and a viewport wider than 600 px; reduced motion disables the movement. Scrollbars are visually hidden while wheel, touch and keyboard scrolling remain available.

The underlined “me” link in “Find me and my work elsewhere.” opens About with the selected **14 Liquid seam** transition. Two flowing vertical edges open from the center over 1.7 seconds; returning home plays the exact mask and contours in reverse. Both views remain live underneath the reveal, and the Life bands stay outside it. About now embeds the Graphic record carousel with three English profile sections, small section labels, the iris center texture and Home link. Fonts and texture decode before the first reveal. The record turns 18 degrees into place and the tonearm approaches during the opening, then reverses on return. Only trusted same-origin parent messages control this movement. Direct #about links, canceled loads, keyboard focus, light/dark themes and reduced motion are supported; resize or hiding the page settles the current transition. Contours keep moving during transitions without a catch-up jump. Without JavaScript, the About target offers a link to the standalone record page.

The earlier falling-logo and ribbon studies are retired from the active preview. Their source remains for reference. The source notes and licences accompany the supplied SVG files in dist/assets/technology-logos/.

## Checks

```sh
node contour-field.test.cjs
node triangle-name.test.cjs
node contour-worker.test.cjs
node artwork-lifecycle.test.cjs
node contour-viewport.test.cjs
node entrance-motion.test.cjs
node entrance-animation.test.cjs
node logo-motion.test.cjs
node about-navigation.test.cjs
node liquid-seam.test.cjs
node signal-cursor.test.cjs
node theme.test.cjs
node transition-motion.test.cjs
node transition-lifecycle.test.cjs
```

Optional local performance diagnostics: open `?profile=1&seed=2` and keep the pointer over the name. The console reports a sample after warmup. Normal visits use a random seed and no diagnostics.

`performance-lab.html` runs the initial entrance, Home, About, two record turns and both Work transitions in a same-origin frame. It records requestAnimationFrame intervals, long tasks and canvas backing sizes locally; no telemetry is sent. Reports in `performance/` compare the published `a036c6d` source with this optimization at a 3840 × 2090 content viewport, DPR 1, in the in-app Chromium browser. Initial entrance p95 dropped from 66.7 ms to 33.4 ms; About/Work transition p95 dropped from 33.4–49.9 ms to 16.8 ms. A repeated optimized run retained these p95 results. This is a browser-specific comparison, not a guarantee for every GPU or phone. Initial entrance still has occasional slow frames.

The contour canvas keeps up to 1.5× supersampling on standard displays, 2× on dense displays and an 8-million-pixel total ceiling. The temporary text/connector entrance canvas has a separate 3-million-pixel ceiling. The difference-blended cursor canvas covers only its pointer and live click rings, with a 2-million-pixel worst-case bound, instead of the entire viewport. Embedded pages have paint/layout containment and temporary composited frame layers during transitions. Record geometry is reused across entrance/exit messages; size, font readiness, visual variant and theme changes still rebuild it.

The focused first-load pass preloads the two Latin fonts used on Home. Hybrid+ crops its temporary text canvas to the heading, and its two separating lines use independent composited DOM layers. At the same 4K viewport the text canvas peaks at 202,536 pixels instead of the previous 3-million-pixel overlay. `performance/after-startup-4k.json` records entrance p95 of 33.3 ms, with one interval over 33.5 ms. Resource timings are from localhost, not a cold-cache GitHub Pages network test. Canvas and DOM overlays are removed on completion or cancellation; the existing visual sequence and reduced-motion behavior remain intact.

## About layout studies

`about-lab.html` is a separate comparison page with three English layouts: `?variant=editorial`, `?variant=statement` and `?variant=living`. Editorial uses two columns and a shared technology strip. Statement combines large typography with project previews on hover, keyboard focus or mobile tap. Living system surrounds a procedural contour figure with 14 selectable technology logos; selection changes its shape and caption.

The earlier layout studies reuse the site fonts, automatic light/dark palette, technology SVGs, contour worker and cursor. Small screens stack the content. Reduced motion keeps artwork static, and hidden pages stop their animation loops. The main local About now uses the record study below.

## Vector turntable study

`turntable.html` is an About experiment based on the Kvasir cover, with no raster images or external libraries. Its chassis, iris record, fixed reflections, spindle, support and movable tonearm are independent SVG groups. Seeded paths construct the iris fibers and vinyl grooves. A stationary printed center label presents short draft English sections while the surrounding iris record rotates.

The three physical buttons select About me, What I build and How I think. Each selection fades the printed copy and moves the needle to the corresponding groove; dragging and releasing the tonearm selects the nearest section. Arrow keys and Home/End offer the same control. Mobile framing enlarges the record, places the buttons below it and keeps the needle outside the enlarged label. Reduced motion disables automatic animation, and hidden tabs suspend it. Copy and selection behavior live in `turntable-sections.js`; `turntable.js` only generates the vector texture.

## Oversized record carousel studies

`record-lab.html` compares six cropped, monochrome SVG turntables: `?variant=minimal`, `graphic`, `wireframe`, `studio`, `macro` and `blend`. Their record diameter exceeds the viewport, with the hub and most of the chassis outside the frame. Draft English copy is printed on the outer moving surface at three positions 120 degrees apart. The text and disc share one rotating group; reflections and hardware remain separate.

Blend combines Minimal's dark palette, Graphic's flat hardware and Macro's close crop. Macro and Blend share a physical drawing scale: a 300 mm record and 230 mm effective tonearm, with the shaft, headshell and pivot scaled from the record radius. The pivot remains beyond the frame; hardware no longer stays small as the record grows.

Graphic uses a detailed green iris texture only on its center label (28% of the record radius), with the outer vinyl unchanged. The texture is generated from the supplied eye reference, preserving asymmetric bright reflections, dark pockets and coarse broken fibers; its master and prompt are in `dist/assets/record/`. The label shares the disc rotation. Its center is normally below the crop; the Center detail control or `?variant=graphic&detail=center` frames this label for inspection, and Back to crop restores the original framing.

Graphic presents three complete, owner-written English sections: Who I Am?, What I Build? and How I Think?. They introduce Tymo and his interest in computing since 2021, describe the tools, games and web apps he builds, and explain his approach to architecture, proven patterns and performance. The owner's wording and punctuation are preserved. Copy wraps at 16 px on desktop and 14 px on mobile, reducing its size in tighter layouts rather than truncating it. Mobile columns reserve space for the headshell, center artwork and controls.

Use the numbered section buttons, previous/next buttons, arrow keys, wheel or horizontal dragging to turn the record. Each turn settles on a readable section. Mobile framing keeps the copy and controls visible. Animation runs only during interaction, reduced motion settles immediately, and resize or hiding the tab completes the current movement. `?variant=graphic&embedded=1` removes lab controls and uses the site theme and cursor for the main About. The earlier full turntable prototype remains separate.

## Record entrance comparison

`record-entrance-lab.html` previews six appearances inside the real Home-to-About Liquid seam: Cue, Spin-up, Roll-in, Groove trace, Pull back and Scan. The laboratory loads the main page with a whitelisted `recordEntrance` query and a preview-only autoplay flag. Replay restarts the transition; Slow doubles both reveal durations; Home and me exercise the reverse and forward directions in place. The main page still defaults to Cue. All modes converge to the same final record pose, support reduced motion and use the existing trusted parent-message lifecycle. `record-entrance-motion.test.cjs` checks the motion samples and reverse poses.


Work raster previews use 1,952,663 bytes instead of 7,299,664 bytes (73.25% less), without reducing their original dimensions. Four photographic images use WebP quality 96; pixel art, logos and UI conversions use lossless WebP with verified identical decoded pixels. Existing JPEG/WebP images and conversions that would grow are retained as-is. The full-resolution masters remain at their original paths; only Work references derivatives under `assets/work/optimized/`. The four photographic derivatives were compared at 460 and 920 px preview widths (luma SSIM at least 0.9982 and 0.9956 respectively), followed by browser checks. `performance/work-images-20261021.json` records sizes, source/output hashes and quality measurements; `tools/optimize-work-images.py` rebuilds them with Pillow and NumPy. These are raster payload figures, excluding shared fonts, scripts and SVG technology logos.

The record builds only after its fonts and iris texture are ready and its iframe has nonzero dimensions. Before Home-to-About motion starts, the parent waits for `RecordStudyPrepare` to measure the final layout and allow two animation frames for preparation. Circular grooves remain in a stationary SVG group; only the printed text and iris rotate, avoiding needless invalidation of all groove paths. The selected Cue effect, section controls and reverse transition are retained. `record-rendering.test.cjs` covers readiness, scene reuse, static grooves, text/iris rotation, resize and missing textures; navigation tests cover cancellation during preparation. Mobile-width browser checks are desktop-browser evidence, not measurements on a physical phone.

About keeps its iframe transform/compositing hint stable throughout the visible panel's lifetime, including idle and return. The opaque panel covers an inert Home without toggling Home artwork/text visibility at the first closing frame; Home animation remains suspended while fully covered. Returning to Home waits two cancellable animation frames behind the fully open seam before the existing reverse record/seam motion begins. Navigation tests cover ordering and cancellation of this preparation. This removes layer-state changes from the start of the reverse animation; actual frame-rate improvement on a physical phone still requires device testing.

Mobile About Cue motion uses Web Animations for text/iris transforms, tonearm transform, disc/hardware opacity and controls opacity. It does not run the record's JavaScript paint loop during reveal or exit. Mobile About/Work masks use native clip-path keyframes, while the seam's canvas outlines retain their existing timeline. Both paths use the same 65 sampled poses in reverse on exit, preserve the selected duration and fall back to the script renderer when animation creation fails. Desktop, wide record crops, other record entrance studies and section turning retain their existing renderer. Tests cover native cancellation, partial creation failure, mask-write reduction and a mobile mask interpolation error below 0.15 px. Native animation support is not a guarantee of GPU compositing or a measured frame rate on a physical phone; see [Chromium's SVG animation notes](https://developer.chrome.com/blog/hardware-accelerated-animations) and its [current compositor eligibility checks](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/core/animation/compositor_animations.cc).

## Publishing

`record-layout-lab.html?layout=wide` compares the selected height-based desktop crop with the previous About framing. In the selected layout, windows at least 1000 px wide and with an aspect ratio of at least 1.3 show the green hub at the lower left, the tonearm pivot at the upper right and larger copy on the moving vinyl. Each printed block is centered on a radius through the spindle, with no sideways offset. Other sizes retain the existing composition. The laboratory includes the real Life bands and Cue transition, a replay control and a Full frame link. The main About route uses the selected layout automatically; the original composition remains available as option 02 in the laboratory.

An independent screenshot review on 2026-10-20 accepted Home, Work and all three About sections in the candidate at 320, 390, 768, 1024, 1280, 1920 and 2560 px widths, plus 844 × 390 landscape. Dark and light palettes and tablet layouts without hover were inspected. Corrections include tonearm clearance from text and controls, visible light-theme navigation arrows, a 44 px About Home target and a compact Home composition for short windows. Full browser captures and the critic's matrix are stored in the task's sibling `visual-review/` folder. Light/coarse inspection used a local media-condition fixture; it is not a claim of physical touch-device testing or a published release. Future visual edits should repeat screenshot review at the affected widths before accepting them.

The selected About appearance is **01 Cue**: an 18-degree record turn and a gentle tonearm approach. The selected typography is **01 Small labels only**: small section labels and body text, without large titles. `record-copy-lab.html` retains both typography options for comparison. Alternate appearances remain available only in the entrance laboratory preview.

GitHub Actions checks the artwork and publishes `dist/` to GitHub Pages after each push to `main`. Pages uses the **GitHub Actions** publishing source.

## Font licenses

- [Cascadia Code — SIL Open Font License](dist/assets/licenses/Cascadia-Code-OFL.txt)
- [Science Gothic — SIL Open Font License](dist/assets/licenses/Science-Gothic-OFL.txt)
