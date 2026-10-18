# Tessera preview materials

Captured from the user's updated `T:/Timbuhtuk/Applications/Tessera.exe` on 2026-10-18 through the native Windows app UI. These are real application screenshots, not reconstructed interface mockups.

- `editor-light.png`: English Light theme, landscape source and actual 1000 × 667 nearest-neighbor upscale result.
- `editor-dark.png`: the same workspace in Dark theme.
- `grid-dark.png`: Dark theme with the Grid tool selected.
- `editor-color.png`: Dark theme, the user's existing four-color window artwork and its saved 512 × 512 result, with the Grid tool selected.
- `windows-result.png`: pixel-preserving crop of the result canvas in `editor-color.png`, rectangle x=27, y=278, width=411, height=411. Retained as an alternative asset; no longer used in the banner.
- `pier-color.png`: original color version of `IMG_4024_pixels_500x333_213146_pixelized_300x200_213338.png`, copied without modification from the Tessera library's `2a913d7ed55b48598bf5a675f9c04b1f/source.png`. Retained in the saved pier card.
- `pier-monochrome.png`: the matching real monochrome result from that library material's `generations/60bf54da87be41e98ad55a3e644eae95/result.png`. Retained in the saved pier card with its original diagonal comparison and left gradient.
- `mural-original.png` and `mural-pixel.png`: both panels extracted directly from the user-supplied `codex-clipboard-ccdd1669-7ed2-40b8-9aa5-0718fd6adfd9.png` screenshot. Original: x=819, y=19, width=640, height=640; pixel result: x=35, y=19, width=640, height=640. No invented or regenerated image content. Current diagonal comparison shows the original in CSS grayscale on the left and the color pixel result on the right. Source assets remain in color.
- `app-icon.png`: original Tessera app icon from `DomainColorTest/Assets/app-icon.png` in the Tessera source checkout.

The monochrome landscape is Tessera's existing `DomainColorTest/Assets/landscape.png`, opened in the app and resized through its UI. Light was the original application theme and was restored after capture. The banner composition uses one large artwork crop and two real editor screenshots, with no added small captions. Source files were not overwritten.

`../../../tessera-card-pier.html` preserves the complete previous pier card separately, with its markup and CSS frozen inline and its original assets retained. It does not depend on future changes to `work-lab.css` or the current card template.
