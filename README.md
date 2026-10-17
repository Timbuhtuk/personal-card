# Timbuhtuk — Personal space

**[Open the card](https://timbuhtuk.github.io/personal-card/)**

A personal link card with procedural contour figures, Game of Life bands and an interactive name that disperses into triangular fragments.

“Solved before you knew it was a problem.”

The page uses self-hosted Science Gothic and Cascadia Code fonts with Tessera design tokens. It has no external runtime dependencies or build step. Reduced motion keeps the name solid and pauses the artwork; animation also stops while the tab is hidden.

One to three figures start at random positions, with curved pressure boundaries and 32 px contour spacing. Strokes are 1.3 px thick. The gap between neighboring figures follows the same 32 px spacing. Contours continue into the center instead of stopping at a fixed layer count. The logical scene is bounded to 1920 × 1080 and compensates for zooming out below one device pixel per CSS pixel. Its supersampled buffer stays within 16 million pixels and 8192 pixels per side, including at 25% browser zoom. Resize and pixel-density changes rebuild the scene. Geometry runs in a worker; each new mesh is drawn once. Supersampling smooths the strokes while the Life cells stay crisp. Hovering or clicking the name scatters its fragments, which return when the pointer leaves. A cached triangular wireframe remains in the original letter shapes beneath the moving fragments.

The name, slogan and account links stay centered at every screen width. The buttons open [GitHub](https://github.com/Timbuhtuk), [LinkedIn](https://www.linkedin.com/in/tymofii-pankovskyi-2827bb331/) and [Telegram](https://t.me/timbuhtuk). On small screens the links wrap to keep the labels and logos readable. Button hover effects require a viewport wider than 600 px and a fine pointer that supports hover; keyboard focus remains visible on every device.

The main page opens with **Hybrid+**: the name is outlined and filled, then a split reveal opens the page while contour strokes draw into place. The 2.85-second entrance starts after the document, fonts, triangle atlas and first contour frame are ready. Resize or reduced motion settles it immediately; hiding the tab pauses it and returning resumes it. Temporary canvases and listeners are released at the end. If preparation fails, the card remains accessible; without JavaScript it is visible immediately.

## Local preview

Run `node server.cjs`, then open `http://localhost:6007/`.

## Entrance studies

Open `entrance-lab.html` to compare six entrance animations on the actual card: Impulse, Gravity, Plotter, Split, Hybrid and Hybrid+. Hybrid uses Plotter's outlined-name sequence, then opens the background and other content with Split's reveal; use `?variant=hybrid` to open it directly. Hybrid+ adds Plotter's progressive contour strokes during the opening; use `?variant=hybridTrace`. Plotter, Split and the original Hybrid remain available individually. The main page uses Hybrid+ without any preview controls. The preview and main page share the same animation renderer. The preview waits for the document, fonts, triangle atlas and first contour frame before starting. It has replay, pause, half-speed and timeline controls; each variant can be linked with its name. During playback the existing simulation is frozen, then resumes after the scene settles. Reduced motion skips automatic playback; the timeline still allows inspecting individual frames. Resizing settles the scene so a replay can use its new dimensions.

## About

The underlined “me” link in “Find me elsewhere.” opens an About view with a circular wipe centered on the activation point. The wipe covers the home copy, fragments and procedural background; the same two Life canvases remain outside it and continue running. About contains a short introduction and the 14 supplied SVG logos in a static, responsive layout. Contour and name updates stop while About is visible. The Back to home link, browser history and direct #about links work. Reduced motion skips the wipe; resize or leaving the tab settles an active transition. Without JavaScript, the #about target still displays the static About content.

The earlier falling-logo and ribbon studies are retired from the active preview. Their source remains for reference. The source notes and licences accompany the supplied SVG files in dist/assets/technology-logos/.

## Checks

```sh
node contour-field.test.cjs
node triangle-name.test.cjs
node contour-worker.test.cjs
node contour-viewport.test.cjs
node entrance-motion.test.cjs
node entrance-animation.test.cjs
node logo-motion.test.cjs
node about-navigation.test.cjs
```

Optional local performance diagnostics: open `?profile=1&seed=2` and keep the pointer over the name. The console reports a sample after warmup. Normal visits use a random seed and no diagnostics.

## Publishing

GitHub Actions checks the artwork and publishes `dist/` to GitHub Pages after each push to `main`. Pages uses the **GitHub Actions** publishing source.

## Font licenses

- [Cascadia Code — SIL Open Font License](dist/assets/licenses/Cascadia-Code-OFL.txt)
- [Science Gothic — SIL Open Font License](dist/assets/licenses/Science-Gothic-OFL.txt)
