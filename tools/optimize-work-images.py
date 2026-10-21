"""Build Work derivatives without overwriting the approved image masters. Requires Pillow and NumPy."""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
OUTPUT = DIST / 'assets/work/optimized'
FILES = [
    'btw/gameplay.png', 'btw/gameplay-wildlife.png', 'btw/gameplay-campfires.png',
    'tessera/mural-original.png', 'tessera/mural-pixel.png', 'tessera/app-icon.png',
    'tessera/editor-light.png', 'tessera/editor-color.png',
    'sonar/brand.png', 'sonar/search.jpg', 'sonar/home.jpg', 'sonar/favorites.png',
    'sidequest/home.jpg', 'sidequest/map.jpg', 'sidequest/library.jpg',
    'kvasir/iris-turntable-detail-banner.webp'
]
PHOTOGRAPHS = {'btw/gameplay.png', 'btw/gameplay-wildlife.png', 'btw/gameplay-campfires.png', 'tessera/mural-original.png'}


def box_mean(values, size=11):
    padded = np.pad(values, size // 2, mode='reflect')
    integral = np.pad(padded, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    return (integral[size:, size:] - integral[:-size, size:] - integral[size:, :-size] + integral[:-size, :-size]) / (size * size)


def compare_preview(original, encoded, width):
    size = (width, round(width / 1.5))
    first = np.asarray(ImageOps.fit(original.convert('RGB'), size, method=Image.Resampling.LANCZOS), dtype=np.float64)
    second = np.asarray(ImageOps.fit(encoded.convert('RGB'), size, method=Image.Resampling.LANCZOS), dtype=np.float64)
    x = first @ np.array([.2126, .7152, .0722])
    y = second @ np.array([.2126, .7152, .0722])
    mu_x, mu_y = box_mean(x), box_mean(y)
    var_x = np.maximum(0, box_mean(x * x) - mu_x * mu_x)
    var_y = np.maximum(0, box_mean(y * y) - mu_y * mu_y)
    cov = box_mean(x * y) - mu_x * mu_y
    score = ((2 * mu_x * mu_y + 6.5025) * (2 * cov + 58.5225)) / ((mu_x * mu_x + mu_y * mu_y + 6.5025) * (var_x + var_y + 58.5225))
    return {'width': width, 'lumaSsim': round(float(score.mean()), 6), 'meanRgbError': round(float(np.abs(first - second).mean()), 4)}


def main():
    results = []
    for file in FILES:
        source = DIST / 'assets/work' / file
        original = Image.open(source)
        image = original.convert('RGBA' if 'A' in original.getbands() else 'RGB')
        entry = {'source': 'assets/work/' + file, 'originalBytes': source.stat().st_size, 'dimensions': image.size,
                 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest()}
        if source.suffix.lower() != '.png':
            entry.update({'output': entry['source'], 'bytes': entry['originalBytes'], 'encoding': 'original', 'pixelIdentical': True})
            results.append(entry)
            continue
        lossless = file not in PHOTOGRAPHS
        quality = 100 if lossless else 96
        options = {'lossless': lossless, 'quality': quality, 'method': 6, 'exact': True}
        if original.info.get('icc_profile'):
            options['icc_profile'] = original.info['icc_profile']
        buffer = BytesIO()
        image.save(buffer, 'WEBP', **options)
        content = buffer.getvalue()
        if len(content) >= entry['originalBytes']:
            entry.update({'output': entry['source'], 'bytes': entry['originalBytes'], 'encoding': 'original', 'pixelIdentical': True})
        else:
            target = OUTPUT / Path(file).with_suffix('.webp')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            decoded = Image.open(BytesIO(content))
            identical = np.array_equal(np.asarray(original.convert('RGBA')), np.asarray(decoded.convert('RGBA')))
            if lossless and not identical:
                raise ValueError('Lossless output changed pixels: ' + file)
            comparisons = [compare_preview(original, decoded, width) for width in [460, 920]]
            if not lossless and comparisons[0]['lumaSsim'] < .995:
                raise ValueError('Preview quality below threshold: ' + file)
            entry.update({'output': target.relative_to(DIST).as_posix(), 'bytes': len(content),
                          'encoding': 'WebP lossless' if lossless else 'WebP quality 96',
                          'pixelIdentical': identical, 'previewComparisons': comparisons,
                          'outputSha256': hashlib.sha256(content).hexdigest()})
        results.append(entry)
    report = {'policy': 'Original dimensions retained. Lossless for pixel art/UI; quality 96 for four photographic images. Larger conversions discarded. Masters untouched.',
              'originalBytes': sum(r['originalBytes'] for r in results), 'optimizedBytes': sum(r['bytes'] for r in results), 'images': results}
    destination = ROOT / 'performance/work-images-20261021.json'
    destination.parent.mkdir(exist_ok=True)
    destination.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
