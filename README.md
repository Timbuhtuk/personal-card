# Timbuhtuk — Personal space

**[Open the card](https://timbuhtuk.github.io/personal-card/)**

A personal link card with procedural contour figures, Game of Life bands and an interactive name that disperses into triangular fragments.

“Solved before you knew it was a problem.”

The page uses self-hosted Science Gothic and Cascadia Code fonts with Tessera design tokens. It has no external runtime dependencies or build step. Reduced motion keeps the name solid and pauses the artwork; animation also stops while the tab is hidden.

The browser's `prefers-color-scheme` selects the existing dark Contrast palette or Tessera Storybook's warm Light palette. CSS selects the theme before the first paint, including without JavaScript. Changing the browser preference updates the artwork, Life colors, name textures, About icons and transition ink without reloading or reseeding the simulation. An active entrance or page transition settles safely when the theme changes. The pixel cursor and click rings invert against the surface underneath them to remain visible on either palette.

The same automatic palette applies to Work (including its embedded frame), all three study pages and the saved pier card. Work labels, technology icons, dividers and preview borders follow the palette; screenshots and banner artwork retain their original appearance. Study controls, selected states, logo studies and transition contours adapt as well. The saved card retains its original composition and frozen layout, with a shared theme override for its surrounding page.

One to three figures start at random positions, with curved pressure boundaries and 32 px contour spacing. Strokes are 1.3 px thick. The gap between neighboring figures follows the same 32 px spacing. Contours continue into the center instead of stopping at a fixed layer count. The logical scene is bounded to 1920 × 1080 and compensates for zooming out below one device pixel per CSS pixel. Its supersampled buffer stays within 16 million pixels and 8192 pixels per side, including at 25% browser zoom. Resize and pixel-density changes rebuild the scene. Geometry runs in a worker; each new mesh is drawn once. Supersampling smooths the strokes while the Life cells stay crisp. Hovering or clicking the name scatters its fragments, which return when the pointer leaves. A cached triangular wireframe remains in the original letter shapes beneath the moving fragments.

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

The underlined “me” link in “Find me and my work elsewhere.” opens About with the selected **14 Liquid seam** transition. Two flowing vertical edges open from the center over 1.7 seconds; returning home plays the exact mask and contours in reverse. Both views remain live underneath the reveal, and the Life bands stay outside it. About contains a short introduction and the 14 supplied SVG logos. Contours use their own animation time: fully hidden About pauses them, while transitions keep them moving without a catch-up jump. The Back to home link, browser history, direct #about links, keyboard focus and reduced motion are supported. Resize or leaving the tab settles the active transition. Without JavaScript, the #about target still displays static About content.

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

## Publishing

GitHub Actions checks the artwork and publishes `dist/` to GitHub Pages after each push to `main`. Pages uses the **GitHub Actions** publishing source.

## Font licenses

- [Cascadia Code — SIL Open Font License](dist/assets/licenses/Cascadia-Code-OFL.txt)
- [Science Gothic — SIL Open Font License](dist/assets/licenses/Science-Gothic-OFL.txt)
