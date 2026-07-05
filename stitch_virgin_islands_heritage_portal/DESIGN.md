---
name: Caribbean Civic Heritage
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#434653'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#737784'
  outline-variant: '#c3c6d5'
  surface-tint: '#2559bd'
  primary: '#00327d'
  on-primary: '#ffffff'
  primary-container: '#0047ab'
  on-primary-container: '#a5bdff'
  inverse-primary: '#b1c5ff'
  secondary: '#006a6a'
  on-secondary: '#ffffff'
  secondary-container: '#90efef'
  on-secondary-container: '#006e6e'
  tertiary: '#661d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#8d2c00'
  on-tertiary-container: '#ffaa8c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b1c5ff'
  on-primary-fixed: '#001946'
  on-primary-fixed-variant: '#00419e'
  secondary-fixed: '#93f2f2'
  secondary-fixed-dim: '#76d6d5'
  on-secondary-fixed: '#002020'
  on-secondary-fixed-variant: '#004f4f'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#380c00'
  on-tertiary-fixed-variant: '#822800'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: EB Garamond
    fontSize: 57px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
  title-lg:
    fontFamily: Public Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style
This design system bridges the gap between institutional stability and tropical vibrancy. The brand personality is authoritative yet rhythmic, evoking the atmosphere of a modern Caribbean administrative hub—reliable, transparent, and energized.

The design style follows a **Modern Corporate** foundation infused with **Minimalist** clarity. It prioritizes high legibility and structured information density, reflecting a "Civic Heritage" through the use of generous white space and rhythmic proportions that mimic colonial architectural symmetry. The emotional response should be one of trusted efficiency and dignified warmth.

## Colors
The palette is anchored by a rejuvenated **Royal Blue**, shifted from a heavy navy to a more energetic cobalt. This maintains civic authority while feeling more digitally native and active. 

- **Primary (#0047AB):** Used for key actions, brand identity, and active states.
- **Secondary (#008080):** A deep teal representing maritime heritage, used for supporting elements and secondary navigation.
- **Tertiary (#FF7F50):** A vibrant coral accent for specific call-outs and status highlights, providing a warm contrast to the blue base.
- **Neutral:** A range of cool-toned greys ensures the interface remains clean and professional.

Contrast ratios are strictly maintained to meet WCAG AA standards, ensuring that text remains legible against the vibrant primary and secondary backgrounds.

## Typography
The typography system pairs the institutional elegance of **EB Garamond** for headings with the utilitarian clarity of **Public Sans** for UI and body text.

- **Headlines:** Use EB Garamond to establish a sense of history and gravitas. Its high-stroke contrast adds a premium, editorial feel to the civic narrative.
- **Body & Labels:** Public Sans provides a neutral, accessible container for complex information. It is designed for legibility at small sizes and high-density layouts.
- **Scale:** On mobile devices, large display fonts scale down significantly to maintain readability without overwhelming the viewport.

## Layout & Spacing
This design system utilizes a **Fixed Grid** model on desktop to preserve the rhythmic symmetry central to the brand's aesthetic.

- **Desktop:** A 12-column grid with 24px gutters and 64px side margins. Content is centered with a max-width of 1280px.
- **Mobile:** A 4-column fluid grid with 16px margins. 
- **Rhythm:** All vertical spacing must be a multiple of the 4px base unit. Component padding should generally follow the `md` (16px) or `lg` (24px) tokens to ensure the UI feels breathable and "premium."

## Elevation & Depth
Depth is conveyed through **Tonal Layers** rather than aggressive shadows. This keeps the interface feeling "flat but layered," similar to documents on a desk.

1.  **Level 0 (Base):** The surface color (#FFFFFF).
2.  **Level 1 (Cards):** A subtle 1px border (#C4C7C5) or a very soft, highly diffused 5% opacity shadow.
3.  **Level 2 (Dropdowns/Modals):** A more pronounced shadow (12% opacity) with a 16px blur to separate floating elements from the background.

Shadows should be tinted with the primary blue (#0047AB) at extremely low saturation to maintain color harmony across the UI.

## Shapes
The shape language is **Soft**. This choice balances the rigidity of civic architecture with a more modern, approachable digital feel.

- **Buttons & Inputs:** Use the standard `rounded` (0.25rem) setting.
- **Cards & Containers:** Use `rounded-lg` (0.5rem) to provide a gentle containerization of content.
- **Status Chips:** Are permitted to use `rounded-xl` (0.75rem) to differentiate them from interactive buttons.

## Components
Consistent component styling ensures the "Civic Heritage" feel is felt in every interaction.

- **Buttons:** Primary buttons use the new #0047AB background with white text. Hover states should darken the blue slightly. Use bold, all-caps for labels in Public Sans to command attention.
- **Input Fields:** Use a 1px outline in #C4C7C5. Upon focus, the border thickens to 2px and changes to the Primary Royal Blue.
- **Cards:** Cards should have no shadow by default, relying on a subtle 1px border. On hover, apply a Level 1 shadow and a slight upward translation (2px).
- **Chips:** Used for categorization, these use the Primary Container color (#D6E2FF) with On-Primary Container text (#001A43) for a high-clarity, low-vibrancy look.
- **Lists:** Use 16px vertical padding between items with a light horizontal divider to maintain the "ledger" look of traditional civic records.