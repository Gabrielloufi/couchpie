# couchPie Branding & Asset Generation Guide

This document archives the prompts, model parameters, reference workflows, and style guidelines used to create the official logo and banner for **couchPie** (a Raspberry Pi–based home media & streaming center).

---

## 🛠️ Generator & Model Specifications

* **AI Generator / Engine**: Google Imagen 3 (via Antigravity / Google GenAI SDK)
* **Workflow Mode**: Text-to-Image (Initial generation) followed by Image-to-Image reference conditioning (iterative refinement & character consistency)
* **Visual Style Profile**:
  * **Style**: 3D Animated CGI / Pixar-inspired character design
  * **Color Palette**: Golden baked crust, berry ruby red, warm tungsten lighting, neon purple & cyan ambient rim lights, slate/charcoal dark backdrop
  * **Character Motifs**: Anthropomorphic baked raspberry pie, dark wayfarer sunglasses, gamer headset mic, crimped pastry crust with raspberry cutouts, aluminum pie tin

---

## 🎨 Final Visual Assets

### 1. couchPie Mascot Logo (Final v3)

* **Target File**: `couchpie_logo_v3`
* **Aspect Ratio**: `1:1` (Square, ideal for App Icon, Favicon, Avatar, GitHub profile)
* **Workflow**: Image-to-Image reference based on `couchpie_logo_v2`
* **Full Prompt**:

```text
Preserve the exact same 3D animated raspberry pie character, golden pastry crust with berry cutouts, black sunglasses, headset mic, pie tin, and glowing controller aesthetic from the reference image. Add the title text 'couchPie' written cleanly below the character in a beautiful, modern rounded glowing font. Integrate the home media and streaming identity: subtly include a sleek media remote control alongside the gamepad, a small smartphone showing touch controller buttons, and tiny glowing multimedia play/streaming symbols around the emblem to show it's both for movies/streaming and gaming. Dark stylish backdrop with neon rim light.
```

### 2. couchPie Media Room Banner (Final v3)

* **Target File**: `couchpie_banner_v3`
* **Aspect Ratio**: 16:9 (Widescreen, ideal for GitHub README header, splash screens, web dashboard)
* **Workflow**: Image-to-Image reference based on `couchpie_banner_v2`
* **Full Prompt**:

```text
Maintain the exact same room, visual style, atmosphere, and 3D raspberry pie character lounging on the sofa from the reference image. Add the project name 'couchPie' written cleanly in a tasteful, stylish illuminated modern font mounted centered on the upper wall. Balance the gaming vibe with media streaming: on the big TV screen, display a sleek modern media center dashboard showing movie streaming posters alongside retro game tiles. On the coffee table next to the popcorn and Raspberry Pi, include a smartphone displaying a virtual touch gamepad app. Keep the cozy ambient lighting, the sleeping cat, and the exact character design.
```

---

## 📜 Iteration History & Baseline Prompts

If you ever need to regenerate from scratch without references:

### Initial Base Banner (Living Room Setup)

* **Aspect Ratio**: 16:9
* **Prompt**:

```text
Wide panoramic banner for 'couchPie'. In a cozy living room at night with soft neon purple, teal, and warm ambient LED lighting, a cool anthropomorphic raspberry pie character wearing sleek black sunglasses is lounging comfortably in the middle of a plush sofa couch. The pie character has expressive cartoon arms playing intensely on a video game controller. On the coffee table in front of the couch are snacks, popcorn, a media remote control, and a mini Raspberry Pi gadget glowing with indicator lights. Cozy home theater and gamer lounge atmosphere, rich textures, Pixar-style 3D digital illustration, widescreen cinematic perspective.
```

### Initial 3D Character Conversion (Base Mascot)

* **Aspect Ratio**: 1:1
* **Prompt**:

```text
Create a 1:1 square mascot logo featuring the EXACT same cute 3D anthropomorphic raspberry pie character from the reference image. The pie character has a golden-baked pastry crust with crimped edges, raspberries peeking out through holes in the top crust, cool black sunglasses, a friendly smile, a subtle gamer headset with microphone, sitting in a fluted cupcake/pie foil liner, and cartoon arms holding a glowing modern video game controller. 3D animated CGI render, Pixar-style character design, centered composition, soft neon ambient rim lighting (purple and cyan), set against a clean stylish dark gradient studio background, perfect for an app icon and profile logo.
```

### Initial Vector Logo Concept (v1 Badge)

* **Aspect Ratio**: 1:1
* **Prompt**:

```text
Modern mascot logo for a media center app named 'couchPie'. A stylish, cute anthropomorphic raspberry pie character wearing sleek cool dark sunglasses, smiling chill and confident, with cartoon arms holding a retro video game controller. High quality vector sticker/app icon aesthetic, bold clean outlines, vibrant raspberry red berry filling, golden baked pie crust, dark circular background badge, professional esports/app branding style, clean vibrant colors.
```

---

## 💡 Style Keywords & Consistency Tokens

When prompting future variations (e.g. stickers, loading spinners, mobile UI icons):

* **Character**: anthropomorphic baked raspberry pie, crimped pie crust, fresh raspberry cutouts, black wayfarer sunglasses, gamer mic headset, pie tin base
* **Lighting**: warm living room ambient lighting, teal and magenta neon rim lights, soft volumetric glow
* **Rendering style**: Pixar-style 3D digital render, octane render, soft studio lighting, clean background
* **Tech details**: illuminated transparent Raspberry Pi board with indicator LEDs, smartphone running virtual gamepad touch controller, media remote, streaming launcher UI
