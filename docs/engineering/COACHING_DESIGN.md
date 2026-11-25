# Coaching visual hierarchy

Updated 20 November 2026 following owner feedback.

## Program cards

- The program title is the strongest text: 24px, semibold, tight line height.
- Audience and outcome descriptions use regular-weight 16px text with relaxed line height. Do not bold descriptive sentences.
- Supporting labels and topics use 14px regular text. Topics form a plain vertical list, without individual pill borders.
- The enquiry is a filled primary button, placed after the outcome. Keep buttons aligned to the bottom of equal-height cards.
- Apply these rules to Olympiad Beginner, Intermediate, Advanced and the IB and A-Level track.
- Keep the different-track label as quiet text, rather than another badge.

## Navigation

Show an explicit Back to Physcratic link to `/` above the coaching header on desktop and mobile, including consultation and tutor pages. The coaching brand retains its local home destination. The return link scrolls away so it does not enlarge the sticky header or cover section anchors.

## Rationale

Readers should identify the program first, scan who it is for and what it covers second, then find the enquiry action. Large or bold body text competes with the title. Bordered topic pills create unnecessary visual noise and resemble controls.

## Hero

Order: centered headline, descriptive subtitle, continuous horizontal coach strip, consultation button, response note, plain stats, optional level picker. Keep the consultation action ahead of the optional picker. Expand the picker when a program enquiry provides a selected level. Do not repeat the introductory paragraph between the subtitle and action.

The coach strip pauses on hover, keyboard focus or the Pause button. Reduced-motion preferences disable automatic movement and hide the decorative duplicate. See all coaches opens `/coaching/coaches`, a dedicated grid with the existing profiles, countries and achievements.

## Guides

Use Free Guides in Title Case, at 30px on small screens and 36px on larger screens. Center its heading and description. Keep See all guides below the cards and point it to `/learn`, the complete existing guide directory.

## Website headings

Page, section, dialog and card titles use Title Case. Keep short connecting words lowercase within a title and preserve acronyms such as IPhO, APhO, EuPhO, IB and A-Level. Descriptions, form labels and action labels stay in sentence case. Update owned interface copy directly rather than applying CSS capitalization to user-created problem statements, names or mathematical text.

## Search

The search entry opens a wide dialog with an input row, a results area and a quiet keyboard-help footer. Reuse the site's popover, foreground, muted, border and accent tokens for both themes. Support Ctrl/Cmd+K, arrow keys, Enter, Escape and a visible close control. Search existing public Arena/archive metadata and published guides only. Keep recent query text in component memory for this page session, with no persistent storage or new external search provider. Load the search panel and index on demand.


## Background and Depth

Replace the repeated grid with broad, quiet blue and accent light behind the hero. Place coach portraits on one raised white gallery surface. Use tinted bands behind Programs and Free Guides to distinguish sections. Keep ordinary cards at low elevation and give the Intermediate card the strongest elevation, a thin accent top edge and a light accent tint. Keep Beginner and Advanced buttons outlined. Shadows share one downward light direction and two reusable levels. Preserve full photos, keyboard focus, reduced-motion settings and the borderless search input.

References: https://atlassian.design/foundations/elevation and https://developer.android.com/develop/ui/compose/designsystems/material3 . These recommend combining surface colour with shadows and using raised surfaces selectively for emphasis.
