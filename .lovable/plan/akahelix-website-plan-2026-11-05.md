# AKAHELIX — website plan

I read all 8 files. The **Website Copy** is the main text source. The **Capability Portfolio** supplies the facts: the 14 approved tests, the test menu, the 5 phases and the limits of what AKAHELIX does. The **Things to do** note sets the three focus areas. The **book cover** and **About the Author** page cover the book. The **teaching portfolio** and **chair's letter** add background on teaching and career history.

## Design direction: "Laboratory Record"

The look is an editorial journal crossed with a lab report. It should read like a serious clinical practice, not a tech startup.

- **No** gradients, glows, glassmorphism, purple, floating DNA helixes, or stock "AI" icons in circles.
- **Paper and ink:** a warm off-white background (like the book cover), near-black text, and a single deep slate-navy accent (the navy from the founder's tie and the book's subtitle). A muted amber is used only for tiny markers, like the cover's gold rule.
- **Type:** a sharp editorial serif for headlines (Newsreader), a clean modern sans for body text (Geist), and a monospaced face (Geist Mono) for specimen-label details like `LDT 104445 · NGS · APPROVED`.
- **Structure:** a visible 12-column grid, thin hairline rules, numbered sections (01 / 02 / 03), lots of whitespace, and big numbers set in the serif.
- **Icons:** Phosphor icons at a thin weight, used sparingly. Mostly arrows and small symbols, never icon-in-a-blob cards.

## Motion (Framer / Webflow feel)

- Smooth, weighted scrolling.
- Headlines reveal line by line from behind a mask. Paragraphs fade up with a small stagger.
- Images uncover with a clip-path wipe and drift slightly as you scroll.
- The big proof numbers count up when they come into view.
- "How it works" is a pinned section: the 5 phases advance as you scroll, with a progress rule.
- The 14 approved tests run in a slow ticker like a lab record, and as a full table on their own page.
- Buttons and links have a magnetic hover and an underline that draws in. The page loads with a short wordmark intro.
- Everything respects "reduce motion" settings and works on phones.

## Images

- The **real founder portrait** you uploaded.
- The **real book cover**, rendered from your PDF.
- About 4 generated photos in a documentary style: muted, natural light, slight grain. Subjects: a pre-PCR bench, a sequencer with sample racks, a karyotype on a microscope monitor, and a clean lab corridor. No blue sci-fi glow.

## Pages

1. **Home:**
   - The headline "Genetics laboratories, built right the first time."
   - The proof bar (14 / 3 / Since 2020 / 67% / 35).
   - Who we work with.
   - The 3 focus areas: Lab setup, Test validation, Education & book.
   - The services preview, the pinned 5-phase process, the SMA case study, Why AKAHELIX, the founder, the FAQ, and the closing call to action.
2. **Services:** all 7 service lines, the standard each one follows, and the test menu by area (carrier screening, cytogenetics, solid tumour, blood cancers, transplant, variant interpretation).
3. **Approach:** the 5 phases with a sign-off at each, the 3 ways to engage (phase package, full build, advisory retainer), and the "Scope and boundaries" commitments.
4. **Track Record:** the full table of 14 approved tests (project, test, method, category, status), plus the selected work timeline from 2020 to 2026.
5. **Founder:** his bio, credentials, a career map across 5 continents (Dhaka → Bangkok → Leuven → Toronto → Houston → New York), and links to LinkedIn, PubMed, ORCID and Einstein.
6. **Book:** _Genetic Blueprint: Bench to Bed_ (First Edition, 2026), the "one book, seven credentials" idea, and the 42 / 11 / 8 coverage figures.
7. **Contact:** "Book a free scoping call", with email, location and a short inquiry form.

Every page gets its own title and description for Google and link previews.

## Choices I made (tell me if you want them changed)

- **Kept private:** CQ code, CAP ID, the `[INSERT]` notes, and anything from the chair's letter or teaching portfolio that looks internal. I use only facts that are safe to publish.
- **Prices:** I show the three ways to engage but **leave out dollar figures** ($30k, $175/hr). The website copy says "agreed after a free scoping call".
- **Contact:** the form opens an email to azadak71@proton.me for now. I can later connect it to a real inbox that saves every request. The phone number stays off the site unless you want it shown.

## Technical details

- Packages: `motion` for animation, `lenis` for smooth scrolling, `@phosphor-icons/react` for icons, and Google Fonts (Newsreader, Geist, Geist Mono) loaded in the root head.
- All colors and type are tokens in `src/styles.css` (oklch), with custom button variants. No hard-coded colors.
- Shared motion pieces: `RevealText`, `FadeUp`, `ImageReveal`, `Counter`, `PinnedPhases`, `Marquee`, `MagneticButton`.
- Content lives in one data file (`src/content/site.ts`), so the copy and test tables stay in sync across pages.
- The portrait and book cover are served through the asset store. Generated photos go in `src/assets`.
- Routes: `/`, `/services`, `/approach`, `/track-record`, `/founder`, `/book`, `/contact`, with a shared header and footer in the root layout.
