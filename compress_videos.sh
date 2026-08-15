#!/bin/bash

# Final Evolution Video Compression Script
# Optimizes curriculum videos for mobile streaming/local storage (H.264)

INPUT_DIR="./public/assets/curriculum"
OUTPUT_DIR="./public/assets/curriculum/compressed"

mkdir -p "$OUTPUT_DIR"

for f in "$INPUT_DIR"/*.mp4; do
    filename=$(basename "$f")
    echo "Compressing $filename..."
    
    # Compress using ffmpeg:
    # -vcodec libx264: Standard H.264 codec
    # -crf 23: Good balance between quality and size
    # -preset fast: Faster encoding
    # -acodec aac: Standard audio codec
    # -movflags +faststart: Optimizes for web streaming (moves metadata to front)
    ffmpeg -i "$f" -vcodec libx264 -crf 23 -preset fast -acodec aac -b:a 128k -movflags +faststart "$OUTPUT_DIR/$filename"
done

echo "Compression complete. Files are in $OUTPUT_DIR"
