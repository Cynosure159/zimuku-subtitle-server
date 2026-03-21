# Zimuku Main Layout - Design System

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Curator."** 

Unlike standard media servers that feel like spreadsheets of files, this system treats metadata and subtitles as high-end editorial content. We move beyond the "template" look by embracing **Atmospheric Depth**. This is achieved through intentional asymmetry, overlapping glass elements, and a layout that breathes. We reject rigid, boxed-in grids in favor of a "floating" interface where content feels suspended in a deep, cinematic space.

## 2. Color & Surface Philosophy
The palette utilizes a sophisticated Deep Slate foundation (`surface: #060e20`) juxtaposed with an elegant, desaturated Violet (`primary: #bdc2ff`).

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders to define sections. Boundaries must be defined solely through:
1.  **Tonal Shifts:** Placing a `surface-container-low` component against a `surface` background.
2.  **Negative Space:** Utilizing the Spacing Scale (e.g., `spacing-8` or `spacing-12`) to create mental separation.
3.  **Glass Differentiation:** Using `backdrop-blur` to signify a change in plane.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use "Tonal Stacking" to define importance:
-   **Base Layer:** `surface` (#060e20) for the main application background.
-   **Structural Areas:** `surface-container-low` (#06122c) for sidebar foundations or background groupings.
-   **Content Cards:** `surface-container` (#0a1836) or `surface-container-high` (#0f1e3f) to bring content forward.
-   **Floating Overlays:** Use `surface-bright` (#182b52) with 60% opacity and a `20px` backdrop-blur to create high-end glassmorphism.

### Signature Textures
Main CTAs and hero states should avoid flat fills. Instead, apply a subtle linear gradient from `primary` (#bdc2ff) to `primary-container` (#3c47af) at a 135-degree angle. This provides a "glow" that feels professional and luminous.

## 3. Typography: Editorial Authority
We utilize two distinct typefaces to create a premium hierarchy: **Manrope** for Brand/Headlines and **Inter** for Utility/Body.

-   **Display & Headlines (Manrope):** Use `display-lg` and `headline-md` with `font-weight: 700` for titles. The wide character set of Manrope feels modern and authoritative.
-   **Body & Metadata (Inter):** Use `body-md` for subtitle previews and descriptions. Inter’s legibility ensures that even dense technical data feels clean.
-   **The Hierarchy Rule:** Always pair a `headline-sm` (Manrope, Bold) with a `label-md` (Inter, Medium, `on-surface-variant`) to create a clear "Title/Subtitle" relationship that guides the eye.

## 4. Elevation & Depth
Depth is the cornerstone of this system. We simulate light passing through layers of frosted glass.

### The Layering Principle
To lift an element, do not default to a shadow. Instead, shift the token:
-   An "Active" card should move from `surface-container` to `surface-container-highest`.
-   Use `surface-tint` at 5% opacity as an overlay for hovered states to simulate "catching the light."

### Ambient Shadows
When a floating effect is required (e.g., a modal or a floating sidebar):
-   **Blur:** `40px` to `60px`.
-   **Opacity:** 4%–8%.
-   **Color:** Use a tinted shadow derived from `primary-dim` (#8a95ff) rather than pure black. This mimics natural ambient light refraction within the deep slate environment.

### The "Ghost Border" Fallback
If accessibility requires a container edge, use a **Ghost Border**: `outline-variant` (#364770) at **15% opacity**. Never use 100% opaque lines.

## 5. Components

### Modern Badges (Subtitle Status/Language)
-   **Style:** `surface-container-highest` background with a 1px "Ghost Border."
-   **Glow:** Apply a subtle `0px 0px 8px` drop shadow using the `primary` color at 30% opacity to make the badge feel "lit" from within.
-   **Typography:** `label-sm` in `primary-fixed`.

### Cards (Media & Subtitle Entries)
-   **Structure:** No borders. Use `surface-container` with `rounded-xl` (1.5rem).
-   **Transitions:** On hover, transition the background to `surface-container-highest` and apply a subtle `translateY(-4px)` over 300ms.
-   **Content:** Forbid divider lines between title and metadata; use a `spacing-2` vertical gap instead.

### Floating Sidebars
-   **Style:** `surface-bright` at 70% opacity with a `backdrop-blur` of `16px`.
-   **Layout:** Disconnected from the edges of the viewport (floating) with `rounded-xl` corners.

### Buttons
-   **Primary:** Gradient fill (`primary` to `primary-container`), `rounded-full`, `title-sm` (Inter, Semibold).
-   **Tertiary:** No background. Use `on-surface` text with a `primary` icon. On hover, add a `surface-variant` circular backdrop.

### Input Fields
-   **Style:** `surface-container-low` fill. No bottom line.
-   **Focus State:** The "Ghost Border" increases to 40% opacity with a subtle `primary` outer glow.

## 6. Do’s and Don’ts

### Do
-   **DO** use asymmetric padding. For example, give a header more top-room (`spacing-16`) than bottom-room (`spacing-8`) to create an editorial feel.
-   **DO** use `primary-dim` for secondary icons to maintain the sophisticated color story.
-   **DO** leave "useless" white space. High-end design is defined by what you *don't* cram onto the screen.

### Don't
-   **DON'T** use pure black (#000000) for backgrounds; it kills the "Deep Slate" depth. Use `surface`.
-   **DON'T** use standard 1px dividers. If separation is needed, use a `spacing-px` tall stripe of `surface-variant` at 20% opacity.
-   **DON'T** use high-saturation colors for alerts. Use `error-dim` (#c44b5f) to maintain the "sophisticated" constraint.

---

## 7. Design Tokens

### 7.1. Typography
- **Global Font Family:** `MANROPE`
- **Headline Font:** `MANROPE`
- **Body Font:** `INTER`
- **Label Font:** `INTER`

### 7.2. Global Settings
- **Color Mode:** `DARK`
- **Color Variant:** `TONAL_SPOT`
- **Roundness:** `ROUND_EIGHT`
- **Spacing Scale:** `3`

### 7.3. Base Primary Overrides
- **Custom Color:** `#6366f1`
- **Override Primary Color:** `#818cf8`
- **Override Secondary Color:** `#475569`
- **Override Tertiary Color:** `#c084fc`
- **Override Neutral Color:** `#0f172a`

### 7.4. Color Palette (Named Colors)

#### Backgrounds & Surfaces
- `background`: `#060e20`
- `on_background`: `#dee5ff`
- `surface`: `#060e20`
- `surface_bright`: `#182b52`
- `surface_dim`: `#060e20`
- `surface_container_lowest`: `#000000`
- `surface_container_low`: `#06122c`
- `surface_container`: `#0a1836`
- `surface_container_high`: `#0f1e3f`
- `surface_container_highest`: `#11244c`
- `surface_tint`: `#bdc2ff`
- `surface_variant`: `#11244c`
- `on_surface`: `#dee5ff`
- `on_surface_variant`: `#99aad9`
- `inverse_surface`: `#faf8ff`
- `inverse_on_surface`: `#4d556b`
- `outline`: `#6475a1`
- `outline_variant`: `#364770`

#### Primary Tokens
- `primary`: `#bdc2ff`
- `primary_dim`: `#8a95ff`
- `primary_container`: `#3c47af`
- `primary_fixed`: `#818cf8`
- `primary_fixed_dim`: `#747fea`
- `on_primary`: `#28329c`
- `on_primary_container`: `#e0e1ff`
- `on_primary_fixed`: `#000000`
- `on_primary_fixed_variant`: `#000979`
- `inverse_primary`: `#4954bc`

#### Secondary Tokens
- `secondary`: `#b9c7df`
- `secondary_dim`: `#abbad1`
- `secondary_container`: `#2e3c4f`
- `secondary_fixed`: `#d5e3fc`
- `secondary_fixed_dim`: `#c7d5ed`
- `on_secondary`: `#334154`
- `on_secondary_container`: `#b2c0d8`
- `on_secondary_fixed`: `#324053`
- `on_secondary_fixed_variant`: `#4e5c71`

#### Tertiary Tokens
- `tertiary`: `#c890ff`
- `tertiary_dim`: `#be83fa`
- `tertiary_container`: `#bc80f8`
- `tertiary_fixed`: `#bc80f8`
- `tertiary_fixed_dim`: `#ae73e9`
- `on_tertiary`: `#400072`
- `on_tertiary_container`: `#2e0055`
- `on_tertiary_fixed`: `#000000`
- `on_tertiary_fixed_variant`: `#3c006c`

#### Error Tokens
- `error`: `#f97386`
- `error_dim`: `#c44b5f`
- `error_container`: `#871c34`
- `on_error`: `#490013`
- `on_error_container`: `#ff97a3`
