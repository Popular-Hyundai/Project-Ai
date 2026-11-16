# Release verification

Production build, local Chrome on Windows, Intel graphics. All automated gates passed in the recorded run. Raw measurements are in `qa-results.json`.

| Gate | Result | Evidence |
| --- | --- | --- |
| TypeScript and production build | Pass | Strict check and pre-render completed with zero errors |
| Entry JavaScript | Pass | 73,466 bytes gzip; renderer deferred |
| Source and rendered text | Pass | Zero filler matches; 108 viewport captures across 375, 768 and 1440 px, default, poster and reduced motion |
| Navigation and keyboard | Pass | 75 visible anchor clicks, skip-link checks, 90 keyboard focus checks and arrow-key finish selection |
| Layout | Pass | Zero horizontal-overflow, tested ring-box overlap or pinned-label failures; maximum recorded CLS 0 |
| Contrast | Pass | Lowest sampled ratio 5.77:1 behind “the noise.” on the desktop hero |
| Browser and network | Pass | Zero console errors or failed requests during the production viewport matrix |
| Graphics | Pass | WebGPU and WebGL2 produced visible output; peak 16 draw calls per scene frame; automatic WebGL2 fallback and SwiftShader poster verified |
| Motion and visibility | Pass | Mobile deferred the canvas; reduced motion used posters; visibility-event and off-screen tests stopped frame advancement |
| Form | Pass | Empty, malformed and valid demo submissions; mocked JSON POST, sending, HTTP 500, retry and success |
| Accessibility | Pass | Zero serious or critical axe findings in the nine viewport/mode combinations |
| Lighthouse mobile | Pass | Performance 100; LCP 0.76 s; CLS 0. The browser matrix identified the DOM H1 as LCP at all three widths |

## Self-audit

The copy omits prices, dates and performance specifications. Sizes, sensor details, capacity, battery life and validation results remain unconfirmed. The relevant sections say when those details will be published. The sleep-stage curve is labelled as an illustration. The one-line morning summary follows the supplied product concept. Those product and publication commitments need the real brand’s approval.

The default form and privacy note both state that the demo saves no email. Live-mode privacy copy assumes the operator honours the stated launch-only purpose and deletion requests. Legal review is flagged. The footer contains the supplied company and year, a fictional-brand disclosure, and no invented contact details.

## Verification scope

The contrast test samples the composited background at four-pixel intervals behind visible text ranges on the captured frames. Layout checks use projected illustration bounds, DOM rectangles and image review. Finite samples do not establish a contrast minimum at every possible animation instant. The hidden-tab handler was exercised with a visibility event; the off-screen test moved the canvas host out of view and verified pause and resume.

Lighthouse used mobile emulation against a local production server. Physical phones, Safari, Firefox, screen-reader sessions, production email storage and deletion handling were outside this run. Mocked POST success verifies the browser contract. The intentional HTTP 500 is tested separately from the clean-load console and network gate. Visual review used the hero checkpoint and the section/scroll screenshot matrix.

