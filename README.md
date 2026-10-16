# Timbuhtuk — Personal space

**[Open the card](https://timbuhtuk.github.io/personal-card/)**

A personal link card with procedural contour figures, Game of Life bands and an interactive name that disperses into triangular fragments.

“Solved before you knew it was a problem.”

The page uses self-hosted Science Gothic and Cascadia Code fonts with Tessera design tokens. It has no external runtime dependencies or build step. Reduced motion keeps the name solid and pauses the artwork; animation also stops while the tab is hidden.

One to three figures start at random positions, with curved pressure boundaries and 32 px contour spacing. Strokes are 1.3 px thick. The gap between neighboring figures follows the same 32 px spacing. Contours continue into the center instead of stopping at a fixed layer count. The logical scene is bounded to 1920 × 1080 and compensates for zooming out below one device pixel per CSS pixel. Its supersampled buffer stays within 16 million pixels and 8192 pixels per side, including at 25% browser zoom. Resize and pixel-density changes rebuild the scene. Geometry runs in a worker; each new mesh is drawn once. Supersampling smooths the strokes while the Life cells stay crisp. Hovering or clicking the name scatters its fragments, which return when the pointer leaves.

The name, slogan and account links stay centered at every screen width. The buttons open [GitHub](https://github.com/Timbuhtuk), [LinkedIn](https://www.linkedin.com/in/tymofii-pankovskyi-2827bb331/) and [Telegram](https://t.me/timbuhtuk). On small screens the links wrap to keep the labels and logos readable. Button hover effects require a viewport wider than 600 px and a fine pointer that supports hover; keyboard focus remains visible on every device.

## Local preview

Run `node server.cjs`, then open `http://localhost:6007/`.

## Checks

```sh
node contour-field.test.cjs
node triangle-name.test.cjs
node contour-worker.test.cjs
node contour-viewport.test.cjs
```

Optional local performance diagnostics: open `?profile=1&seed=2` and keep the pointer over the name. The console reports a sample after warmup. Normal visits use a random seed and no diagnostics.

## Publishing

GitHub Actions checks the artwork and publishes `dist/` to GitHub Pages after each push to `main`. Pages uses the **GitHub Actions** publishing source.

## Font licenses

- [Cascadia Code — SIL Open Font License](dist/assets/licenses/Cascadia-Code-OFL.txt)
- [Science Gothic — SIL Open Font License](dist/assets/licenses/Science-Gothic-OFL.txt)
