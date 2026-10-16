function contourViewport(width, height, pixelRatio = 1)
{
    width = Math.max(1, width);
    height = Math.max(1, height);
    if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) pixelRatio = 1;

    // Zooming out adds CSS pixels, not visible screen area. Keep the scene bounded.
    const sceneScale = Math.min(1, pixelRatio, 1920 / width, 1080 / height);
    const rasterScale = Math.min(3, Math.max(pixelRatio, Math.min(2, pixelRatio * 2)),
        Math.sqrt(16000000 / (width * height)), 8192 / width, 8192 / height);
    return {
        width: width * sceneScale,
        height: height * sceneScale,
        pixelWidth: Math.max(1, Math.floor(width * rasterScale)),
        pixelHeight: Math.max(1, Math.floor(height * rasterScale))
    };
}
