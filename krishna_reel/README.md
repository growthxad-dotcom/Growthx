# KRISHNA SPICES — Coming Soon Reel (1080×1920, 30 fps, ~15 s)

Final video: `out/krishna_spices_coming_soon_reel.mp4` (H.264 + AAC, yuv420p, faststart).

## How it was made
No Blender/GPU was available, so this is a layered "3D motion-graphics" render, fully in code:
* `src/sprites.py` – procedurally models and lights (normal-mapped Phong shading, specular, bounce light)
  every spice sprite: cardamom, clove, black pepper, cinnamon, cumin, fenugreek, fennel, coriander, star anise,
  dried red chilli, leaves, and 4 wooden bowls with turmeric / red chilli / coriander / cumin powder.
* `src/render.py` – compositor: parallax camera, depth of field, soft shadows, volumetric light beams,
  gold bokeh, powder swirl transition, circular golden light reveal, shimmer, sparkles, typography (Cinzel, OFL).
  The **original logo** (`assets/logo_original.png`) is only scaled uniformly (LANCZOS) and feather-blended into
  the matching ivory background; it is never redrawn, recoloured or deformed.
* `src/audio.py` – synthesised soundtrack (drone, chimes, whooshes, impacts, sparkle); no samples / no copyrighted music.

## Re-render
```
pip install pillow numpy          # ffmpeg with libx264 + aac required
cd krishna_reel
python3 src/sprites.py            # regenerate sprites/ (~40 s)
python3 src/audio.py              # -> out/audio.wav
python3 src/render.py --video out/video_silent.mp4     # ~25-40 min on 4 cores
ffmpeg -i out/video_silent.mp4 -i out/audio.wav -c:v copy -c:a aac -b:a 192k -shortest out/krishna_spices_coming_soon_reel.mp4
python3 src/render.py --stills 3.5 10.5 14.5            # preview single frames in stills/
```
Fonts: `assets/fonts/` (Cinzel, SIL Open Font License). `assets/reference_banner.png` was supplied as reference only.

## Timeline
0–3 s Magic of Spices · 3–6 s Whole Spices · 6–9 s Ground Spices (powder swirl at ~5.9 s) ·
9–12 s golden circular reveal of the logo · 12–15 s tagline + COMING SOON, final sparkle, held to the end.
