importScripts('contour-field.js', 'contour-scheduler.js');

let field = null;
onmessage = event => {
    const { id, version, time, config } = event.data;
    try
    {
        if (config)
        {
            field = Object.assign(Object.create(ContourField.prototype), config,
                { dragged: null, frames: [], displayFrames: [], meshTime: -Infinity, dirty: true });
        }
        const start = performance.now();
        field.buildMesh(time);
        const result = packContourFrames(field.frames);
        postMessage({ id, version, result, elapsed: performance.now() - start }, [result.coordinates.buffer]);
    }
    catch (error) { postMessage({ id, version, error: String(error) }); }
};
