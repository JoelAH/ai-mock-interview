#!/bin/bash
#
# Generate .icns from a source PNG (1024x1024).
# Usage: ./scripts/generate-icons.sh <source.png>
#
# Requires macOS (uses iconutil) and sips for resizing.
# The resulting icon.icns goes into build/icon.icns.

set -e

SOURCE="${1:-build/icon-source.png}"
ICONSET="build/AppIcon.iconset"
OUTPUT="build/icon.icns"

if [ ! -f "$SOURCE" ]; then
  echo "Source file not found: $SOURCE"
  echo "Please place a 1024x1024 PNG at build/icon-source.png"
  echo ""
  echo "Creating a placeholder icon..."

  # Generate a simple placeholder using sips (macOS built-in)
  # Create a 1024x1024 tiff then convert to PNG
  mkdir -p build
  # Use Python to create a simple gradient PNG placeholder
  python3 -c "
import struct, zlib

def create_png(width, height, filename):
    def make_row(y):
        row = b''
        for x in range(width):
            r = int(99 + (x/width) * 50)
            g = int(102 + (y/height) * 50)
            b = int(241)
            a = 255
            row += struct.pack('BBBB', r, g, b, a)
        return b'\x00' + row

    raw = b''.join(make_row(y) for y in range(height))
    
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    
    with open(filename, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', zlib.compress(raw)))
        f.write(chunk(b'IEND', b''))

create_png(1024, 1024, '$SOURCE')
print('Created placeholder icon at $SOURCE')
"
fi

echo "Generating iconset from $SOURCE..."
mkdir -p "$ICONSET"

# Required sizes for macOS .icns
sizes=(16 32 64 128 256 512 1024)
for size in "${sizes[@]}"; do
  sips -z $size $size "$SOURCE" --out "$ICONSET/icon_${size}x${size}.png" > /dev/null 2>&1
done

# Retina variants
sips -z 32 32 "$SOURCE" --out "$ICONSET/icon_16x16@2x.png" > /dev/null 2>&1
sips -z 64 64 "$SOURCE" --out "$ICONSET/icon_32x32@2x.png" > /dev/null 2>&1
sips -z 128 128 "$SOURCE" --out "$ICONSET/icon_64x64@2x.png" > /dev/null 2>&1  
sips -z 256 256 "$SOURCE" --out "$ICONSET/icon_128x128@2x.png" > /dev/null 2>&1
sips -z 512 512 "$SOURCE" --out "$ICONSET/icon_256x256@2x.png" > /dev/null 2>&1
sips -z 1024 1024 "$SOURCE" --out "$ICONSET/icon_512x512@2x.png" > /dev/null 2>&1

echo "Converting to .icns..."
iconutil -c icns "$ICONSET" -o "$OUTPUT"

# Clean up
rm -rf "$ICONSET"

echo "Done: $OUTPUT"
