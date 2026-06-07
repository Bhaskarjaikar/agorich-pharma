# Agorich Pharma — Enterprise-Grade Mobile UI Prompts
### 57 Screens · Copy-Paste Ready · Mobile App Only

---

> **Global Design System** (referenced in every prompt below):
> - **Stack**: Next.js App Router · Tailwind CSS · shadcn/ui · Framer Motion · Phosphor Icons
> - **Palette**: Primary `#0F172A` (slate-900) · Accent `#06B6D4` (cyan-500) · Success `#10B981` · Danger `#EF4444` · Warning `#F59E0B` · Surface `#1E293B` · Muted `#334155`
> - **Typography**: Display — `DM Serif Display` · Body — `DM Sans` · Mono — `JetBrains Mono`
> - **Mobile Canvas**: 390×844 px (iPhone 14 reference) · safe-area-inset respected
> - **Dark Theme**: Default dark mode with deep navy `#0A0F1E` base background
> - **Radius**: Cards `rounded-2xl` · Buttons `rounded-xl` · Chips `rounded-full`
> - **Motion**: Framer Motion page transitions (slide-up on enter, fade on exit) · spring physics on interactive elements
> - **Components**: Bottom tab bar (5 tabs max) · Floating action buttons · Swipeable cards · Pull-to-refresh
> - **Shadows**: Layered glow shadows using accent color at 20% opacity

---

## 🔐 AUTHENTICATION SCREENS

---

### SCREEN 01 — Login · `/login`

```
Design an enterprise-grade mobile login screen for "Agorich Pharma", a B2B pharmaceutical platform. Mobile canvas 390×844px, dark theme.

VISUAL DIRECTION:
- Full-screen animated background: slow-moving deep navy (#0A0F1E) gradient mesh with subtle cyan (#06B6D4) and indigo light leaks in the corners
- Floating geometric shapes (pill/capsule silhouettes) rendered as very low-opacity white outlines drifting slowly in the background using CSS keyframe animation
- Logo at top-center: "AGORICH" in DM Serif Display bold, 28px, white; "PHARMA" in DM Sans light tracking-widest, 11px, cyan-400; underneath a thin 1px cyan glowing horizontal line

LAYOUT (top to bottom):
1. Status bar area (safe zone, 44px)
2. Logo block centered — vertical padding 48px top
3. Hero tagline: "Your pharmaceutical supply chain, unified." — DM Sans 15px, slate-400, centered, max-width 260px, line-height 1.6
4. Last-used account quick-card (conditionally shown): glass card (backdrop-blur-md, bg-white/5, border border-white/10), shows avatar circle with initials, business name, email — tap to auto-fill, "Continue as →" button in cyan
5. Divider: thin line with "or sign in" text centered in slate-500
6. Email input: full-width, bg-slate-800/80, border border-slate-600, rounded-xl, 52px height, left icon (EnvelopeSimple phosphor), placeholder "Business email", label floats on focus (animated), text white, focus ring cyan-500 glow
7. Password input: same style, left icon LockSimple, right icon Eye/EyeSlash toggle, placeholder "Password"
8. "Forgot password?" link right-aligned, cyan-400, 13px
9. Primary CTA button: full-width, 56px height, rounded-xl, gradient bg from cyan-500 to blue-600, white bold text "Sign In", subtle shimmer animation on idle, scale-95 on press
10. Google sign-in button: full-width, 52px, bg-white/8 border border-white/15, Google G logo SVG left, "Continue with Google" text white medium
11. Bottom link: "Don't have an account? " slate-400 + "Sign Up" cyan-500 underline

MICRO-INTERACTIONS:
- Input focus: border glows cyan, label slides up with spring animation
- Button press: scale(0.97) with haptic-style quick bounce back
- Page enter: elements stagger-fade up from y+20 with 60ms delays
- Error state: inputs shake horizontally, border turns red-400, error message slides in below

ADDITIONAL DETAILS:
- Dark mode toggle (sun/moon icon) top-right corner, 36px icon button, bg-white/5 rounded-full
- Bottom safe area padding 34px
- No scrolling needed — all fits in viewport
- Language switcher (EN/HI) top-left, small pill button
```

---

### SCREEN 02 — Signup · `/signup`

```
Design an enterprise-grade mobile signup screen for "Agorich Pharma" B2B pharma platform. Mobile 390×844px, dark theme matching the login screen.

VISUAL DIRECTION:
- Same animated background as login: deep navy gradient mesh, floating capsule outlines, cyan light leaks
- Smooth slide-in transition from login screen (enter from right)

LAYOUT (scrollable, single column):
1. Top navigation bar: back arrow (ArrowLeft phosphor) left, "Create Account" title DM Serif Display 20px centered, white
2. Progress indicator: 4 dots below nav, first dot active (cyan filled, 8px), rest slate-600 (6px) — subtle pulsing animation on active dot
3. Section heading: "Let's get you started" DM Serif Display 26px white, sub "Join thousands of pharma businesses" DM Sans 14px slate-400
4. Google signup button first (most prominent): full-width, 52px, white background, Google G logo, "Sign up with Google" text slate-800 semibold — this is the preferred/recommended CTA
5. Divider: "or fill in your details"
6. Form fields stacked with 16px gap:
   - Email: icon EnvelopeSimple, label "Business Email", validation tick appears on valid entry
   - Phone: icon Phone, label "Phone Number", +91 country code prefix chip on left (tap to change), Indian format hint
   - Password: icon LockSimple, show/hide toggle, strength meter below (4 segments: weak=red, fair=orange, good=yellow, strong=green) with label text
   - Confirm Password: icon CheckCircle, real-time match indicator (✓ green glow when matches)
7. Terms checkbox: custom checkbox (cyan when checked), "I agree to the Terms of Service and Privacy Policy" with cyan links
8. Primary CTA: "Create Account →" full-width 56px gradient cyan-to-blue button, disabled/grayed when form invalid, shimmer on valid+idle
9. Bottom: "Already have an account? Sign In" link

MICRO-INTERACTIONS:
- Password strength bar animates segment fill with spring
- Valid field: green tick fades in right side
- Invalid field on blur: red border + slide-down error message
- Submit loading state: button shows spinner + "Creating your account..." text

ADDITIONAL DETAILS:
- Keyboard-aware scrolling (content shifts up when keyboard appears)
- Safe area insets respected top and bottom
```

---

### SCREEN 03 — Onboarding Hub · `/onboarding`

```
Design an enterprise-grade mobile onboarding hub / role-selection splash screen for "Agorich Pharma". Mobile 390×844px, dark theme.

VISUAL DIRECTION:
- Full-screen: deep navy base with a large glowing cyan orb (radial gradient, 300px diameter) centered at 60% height, very low opacity (8%), creating a soft atmospheric glow
- Agorich Pharma logo centered top third of screen

LAYOUT:
1. Safe area top
2. Logo + branding block (same as login, centered)
3. Large animated loading/routing indicator: a custom circular progress ring in cyan with "Setting up your workspace..." DM Sans 14px slate-400 below
4. Below the spinner: role detection message that morphs between texts using fade transitions:
   - "Identifying your role..."
   - "Personalizing your dashboard..."
   - "Almost ready..."
5. Bottom area: thin progress bar (full width, 4px height, rounded-full) filling from left to right in cyan over ~2 seconds
6. Powered by Agorich badge bottom center: small logo + "Powered by Agorich" slate-500 12px

VISUAL DETAILS:
- The entire screen fades in on mount (opacity 0→1, 400ms)
- The orb pulses very slowly (scale 0.95↔1.05, 3s ease-in-out loop)
- Progress bar fills with a shimmer/gleam sweeping right on the filled portion
- After completion: full screen fades out, then role-specific dashboard slides up

NO interactive elements — purely a loading/routing screen.
```

---

### SCREEN 04 — Distributor Onboarding · `/onboarding/distributor`

```
Design an enterprise-grade mobile multi-step onboarding form for a Distributor on "Agorich Pharma". Mobile 390×844px, dark theme. 4-step wizard.

VISUAL DIRECTION:
- Dark navy base (#0A0F1E)
- Top section: a thin horizontal step progress bar (4 segments, completed = cyan filled, current = cyan with pulse, remaining = slate-700)
- Step counter top-right: "Step 2 of 4" DM Sans 13px slate-400

TOP NAV:
- Back arrow left (navigates to previous step or exits)
- Step title center (changes per step): DM Serif Display 20px white
- Skip text right (only on non-required steps): slate-400

STEP 1 — Business Identity:
- Section title: "Tell us about your business" 22px DM Serif Display white
- Sub: "We need this for GST compliance and verification"
- Fields: Business Name (Building phosphor icon), Business Type (dropdown — Proprietorship/Partnership/LLP/Pvt Ltd/Public Ltd/Other, custom styled select with bottom sheet on mobile), GSTIN (IdentificationCard icon, 15-char format hint + real-time format validation), PAN (IdentificationCard icon, 10-char)

STEP 2 — Contact & Location:
- Fields: Email, Phone (+91 prefix), Address Line 1, City, State (bottom sheet state picker with search), Pincode (auto-fills city/state on valid entry)

STEP 3 — Bank Details:
- Secure badge at top: ShieldCheck icon cyan + "Your data is encrypted" text
- Fields: Account Number (Bank icon, masked show/hide), Confirm Account Number, IFSC Code (MagnifyingGlass icon, auto-fetch bank name on valid IFSC — shows bank name chip below field)
- Bank verification status chip: "Verifying..." → "HDFC Bank, Mumbai ✓"

STEP 4 — Review & Submit:
- Summary cards for each section (accordion style, each expandable with ChevronDown)
- "Edit" text button on each card section
- Terms and conditions checkbox
- Large submit button: "Complete Registration" full-width gradient cyan-blue 56px

FIELD STYLING (all steps):
- bg-slate-800/60, border border-slate-600, rounded-xl, 52px, left icon in cyan-400, floating label animation, focus ring cyan glow
- Error: red-400 border + slide-down error text

BOTTOM:
- Sticky bottom button area (above safe zone): primary Next/Submit button + secondary Back link
- Keyboard-aware — content scrolls above keyboard
```

---

### SCREEN 05 — Retailer Onboarding · `/onboarding/retailer`

```
Design an enterprise-grade mobile multi-step retailer onboarding form for "Agorich Pharma". Mobile 390×844px, dark theme. 3-step wizard.

VISUAL DIRECTION:
- Same dark navy theme as Distributor Onboarding
- Step progress bar: 3 segments (cyan = done, pulsing cyan = current, slate = upcoming)
- Warm accent: use emerald-400 (#34D399) for retailer-specific brand touches (vs cyan for distributor)

STEP 1 — Personal & Business Info:
- Title: "Set up your store"
- Fields: Owner Full Name (User icon), Phone Number (+91 prefix chip), Business Name (Storefront icon), Business Type (bottom sheet picker)

STEP 2 — Store Location:
- Title: "Where is your store?"
- Full-width map embed (rounded-2xl, 200px height): shows interactive pin on a dark-styled map (Mapbox dark style or OpenStreetMap with dark filter)
- Below map: "Drag pin or search" helper text slate-400
- Address search bar with autocomplete dropdown (glass morphism dropdown, dark bg, search results with MapPin icons)
- Manual fields: Address Line 1, City, State, Pincode — auto-filled when pin placed
- Latitude/Longitude display: small read-only chip row below (monospace font, slate-500 background, auto-updated on pin drag)
- "Use my current location" button: GPS icon + text, cyan outline button

STEP 3 — Review & Submit:
- Profile preview card at top: emerald gradient left border, shows name, business name, address on map thumbnail
- Editable sections listed below with "Looks good" chip or "Review" warning chip
- Submit button: "Start Ordering!" full-width emerald-to-cyan gradient, 56px

MICRO-INTERACTIONS:
- Map pin drops with a bounce animation when location selected
- Address fields populate with a stagger-fill animation
- Coordinate chips update with a subtle number-roll animation
```

---

### SCREEN 06 — Retailer Location Registration · `/retailer/register/location`

```
Design an enterprise-grade mobile location registration screen for a Retailer on "Agorich Pharma". Mobile 390×844px, dark theme.

LAYOUT:
- Full-screen map (100% height, dark map style) as the base layer
- Floating top bar (glass morphism, backdrop-blur-md, bg-black/40): back arrow left, "Set Store Location" title center DM Serif Display 18px white
- Map center has a fixed pin (custom cyan MapPin icon 40px) that floats above the map with a subtle drop shadow pulse
- Bottom sheet (fixed, rounded-2xl top, bg-slate-900, 280px height, draggable):
  - Handle bar top center (4px × 32px, slate-600, rounded-full)
  - "Your store will appear here for nearby buyers" slate-400 13px centered
  - Address preview: detected address string, white semibold 16px, truncated with fade
  - Coordinates row: lat/lng in monospace JetBrains Mono, slate-500, small
  - "Confirm Location" button: full-width 56px, emerald gradient, bold, MapPin icon + text
  - "Search a different address" ghost button below: outline, slate text

MICRO-INTERACTIONS:
- As user drags map: center pin lifts (scale 1.1 + drop shadow grows) while dragging, settles back on release
- Address text updates with fade transition when new location detected
- Confirm button: loading spinner state, then checkmark success animation, then screen exit
```

---

## 🏠 UNIVERSAL DASHBOARD

---

### SCREEN 07 — Root Dashboard / Role Router · `/dashboard`

```
Design an enterprise-grade mobile role-routing splash screen for "Agorich Pharma". Mobile 390×844px, dark theme. This screen auto-redirects based on user role.

VISUAL DIRECTION:
- Full-screen: deep navy (#0A0F1E) with animated particle field (50 tiny white dots drifting slowly, connected by thin lines when nearby — pharma molecular network metaphor)
- Center: Agorich Pharma logo (large, 48px display font) with a slow rotation glow ring around the "A" monogram

CONTENT:
- Centered vertically: logo block, then 24px gap, then "Routing to your dashboard..." DM Sans 16px slate-400
- Animated role badge that materializes: rounded-full pill, shows detected role (e.g., "DISTRIBUTOR") in cyan uppercase tracking-widest 12px, bg-cyan-500/10 border border-cyan-500/30
- 3-dot animated loading indicator below in cyan
- Full-width progress bar at very bottom of screen (4px, cyan shimmer fill, 1.5s duration)

NO user interaction — pure loading state.
Full-screen fade-out exit transition then role dashboard slides up.
```

---

## 🛡️ ADMIN SCREENS

---

### SCREEN 08 — Admin Dashboard · `/admin`

```
Design an enterprise-grade mobile admin dashboard for "Agorich Pharma" B2B pharma platform. Mobile 390×844px, dark theme. This is the command center for the Admin role.

TOP BAR:
- bg-slate-900/90 backdrop-blur-md, border-b border-white/5, 60px height
- Left: "Agorich" wordmark in DM Serif Display 18px cyan
- Center: "Admin Dashboard" DM Sans 14px slate-400
- Right: notification bell (Bell phosphor) with red badge count, then avatar circle (initials, 32px, cyan gradient bg)

HERO METRICS ROW (horizontal scroll, 4 cards):
Each card: 160px wide, 100px height, bg-slate-800/80 rounded-2xl, border border-white/5, padding 16px
- Card 1: "Total Revenue" — large number ₹24.6L in DM Serif Display 28px white, trend arrow (↑ 12%) in emerald, icon CurrencyInr cyan top-right
- Card 2: "Total Retailers" — 1,247, trend ↑, icon Storefront
- Card 3: "Outstanding" — ₹3.2L, warning icon, amber color scheme
- Card 4: "AI Agents" — 4 Active, icon Robot, cyan color scheme

SECTION: Revenue Chart
- "Revenue Overview" section header: DM Sans 16px white semibold + "Last 6 months" slate-400 small right
- Recharts AreaChart: 100% width, 180px height, dark theme, gradient fill from cyan-500 at 60% opacity to transparent, smooth curve line cyan, custom tooltip glass morphism

SECTION: Top Retailers
- Section header with "View All →" link cyan right
- 3 retailer list items: rank number (cyan), business name (white medium), city (slate-400 small), revenue (white semibold) right, trend chip right
- Each item: horizontal card, 64px height, bg-slate-800/50 rounded-xl, swipeable (left swipe reveals "View" action)

SECTION: AI Performance
- Compact panel: bg-gradient-to-r from-slate-800 to-slate-900, border-l-4 border-cyan-500, rounded-xl
- "JARVIS AI" label + Robot icon + "4 agents active" status dot (green)
- 4 mini metric chips in a row: Uptime 99.2%, Avg Response 1.2s, Success 98.7%, Cost Today ₹142

SECTION: Quick Alerts
- 2–3 alert cards stacked: icon left (Warning/CheckCircle/Info), message text, timestamp right, colored left border per severity

BOTTOM TAB BAR (5 tabs):
bg-slate-900 border-t border-white/5, 80px height with safe area, icons 24px:
Dashboard (active, cyan), Retailers, Invoice Flow, Command Center, Settings
Active tab: icon + label in cyan, background pill bg-cyan-500/10 rounded-xl

FLOATING ACTION: none on this screen (FAB not needed for admin dashboard)

MICRO-INTERACTIONS:
- Metric cards: tap → scale 0.97, ripple, navigate
- Chart: touch reveals tooltip with spring animation
- Page load: cards stagger-animate in from bottom with 80ms delays
```

---

### SCREEN 09 — Admin Command Center · `/admin/command-center`

```
Design an enterprise-grade mobile AI Command Center screen for "Agorich Pharma" admin. Mobile 390×844px, dark theme. This is the JARVIS AI chat interface.

VISUAL DIRECTION:
- Dark base with a subtle blue-cyan gradient glow at the top (radial, from top center) — feels like a control room display
- Top section has real-time metrics; bottom section is a chat interface

TOP SECTION (static, 220px):
- Full-width header: "⚡ JARVIS Command Center" DM Serif Display 18px white, subtitle "AI-Powered Operations" slate-400 12px, Robot icon cyan animated (subtle glow pulse)
- Metrics 2×2 grid (4 compact cards, bg-slate-800/60, rounded-xl, border border-cyan-500/10):
  * Activity: "247 tasks" cyan large number
  * Avg Response: "1.2s" emerald
  * Success Rate: "98.7%" emerald
  * Cost Today: "₹142" amber
- AI Performance mini-chart: 60px height sparkline (Recharts LineChart), cyan line, no axes — just the shape

CHAT SECTION (fills remaining space, scrollable):
- Chat bubbles layout:
  * AI messages (JARVIS): left-aligned, bg-slate-700/80 rounded-2xl rounded-tl-sm, max-width 80%, cyan "J" avatar circle 28px, DM Sans 14px white, timestamps slate-500 11px below
  * User messages: right-aligned, bg-gradient cyan-500 to blue-600 rounded-2xl rounded-tr-sm, max-width 75%, white text
- Typing indicator: 3-dot bounce animation in AI bubble style
- Sample AI message showing: formatted response with a mini table (dark table, cyan header row) embedded in chat bubble

INPUT BAR (sticky bottom, above safe area):
- bg-slate-800/90 backdrop-blur, border-t border-white/5, padding 12px 16px
- Text input: flex-1, bg-slate-700/80 rounded-xl 44px, placeholder "Ask JARVIS anything...", left icon MicrophoneSimple
- Send button: 44px square, bg-cyan-500, rounded-xl, PaperPlaneTilt icon white, disabled state slate-600

MICRO-INTERACTIONS:
- New message slides in from bottom with spring
- AI response: text appears word-by-word (typewriter effect) in the bubble
- Input focus: bar slides up above keyboard
```

---

### SCREEN 10 — Admin Retailers · `/admin/retailers`

```
Design an enterprise-grade mobile retailers management screen for "Agorich Pharma" admin. Mobile 390×844px, dark theme.

TOP BAR:
- "Retailers" DM Serif Display 20px white, "1,247 registered" slate-400 sub
- Right: Export icon (ArrowSquareOut) + Filter icon with active indicator dot

SEARCH BAR:
- Full-width, bg-slate-800, rounded-xl, 48px, MagnifyingGlass icon left, slate-400 placeholder "Search by name, city, phone..."
- Below search: horizontal filter chips (scrollable, no-scrollbar): "All" (active, cyan bg), "Verified ✓", "Unverified", "High Revenue", "Recent" — each chip rounded-full 32px

SORT ROW:
- "Sort by:" label slate-400 + current sort button "Revenue ↓" cyan chip, tap to cycle through options

RETAILER LIST (scrollable, virtualized):
Each retailer card — bg-slate-800/60 rounded-2xl border border-white/5 12px padding, margin-bottom 10px:
- TOP ROW: verification badge (ShieldCheck emerald / ShieldWarning amber icon + "Verified"/"Unverified" text) right, rank number left in slate-500
- MAIN ROW: 
  * Avatar circle 44px with initials, gradient bg based on first letter
  * Business name: white semibold 16px
  * Owner name: slate-400 13px
  * Location chip: MapPin icon + city, state — slate-500 12px
- METRICS ROW (3 chips inline):
  * Orders: small box icon + number
  * Revenue: CurrencyInr + ₹X.XL
  * Outstanding: if >0 show amber chip, if 0 show emerald "Paid"
- BOTTOM: "Last order: 3 days ago" slate-500 11px + "View Details →" cyan text button right

LOAD MORE: "Load 20 more" outlined button centered, slate border

MICRO-INTERACTIONS:
- Card tap: scale 0.98 spring, then navigate with slide-left transition
- Swipe left on card: reveals red "Block" action and blue "Message" action
- Filter chip select: spring scale + cyan fill animation
- Search: results filter with fade transition (not re-render flash)
```

---

### SCREEN 11 — Admin Retailer Detail · `/admin/retailers/[id]`

```
Design an enterprise-grade mobile retailer detail screen for "Agorich Pharma" admin. Mobile 390×844px, dark theme.

TOP NAV:
- Back arrow (ArrowLeft) left, "Retailer Profile" center DM Serif Display 18px, action menu (DotsThreeVertical) right

HERO PROFILE CARD:
- Full-width card, bg-gradient from slate-800 to slate-900, rounded-b-3xl, padding 24px
- Top: verification badge pill (ShieldCheck emerald/ShieldWarning amber) right-aligned
- Large avatar circle 64px, initials, gradient bg
- Business name: DM Serif Display 24px white
- Owner name: DM Sans 16px slate-300
- Phone chip: Phone icon + number, tappable (tel: link)
- City, State: MapPin icon slate-400
- Member since: CalendarBlank slate-500 12px
- Action buttons row: "Call" (Phone, emerald), "Message" (Chat, cyan), "Block" (Prohibit, red) — each 80px rounded-xl button with icon + label

METRICS GRID (2×2):
bg-slate-800/60 cards, rounded-2xl:
- Total Orders (ShoppingCart cyan)
- Total Revenue (CurrencyInr emerald)  
- Outstanding (Warning amber)
- Units Purchased (Package slate)

SECTION: Invoice History
- Section header + "View All" link
- Invoice list items: invoice number (cyan monospace), date, amount, status chip (PAID=emerald, PENDING=amber, PROCESSING=blue, DRAFT=slate), chevron right

SECTION: Location
- Map thumbnail (rounded-2xl, 150px height, dark map style, pin at retailer coords)
- Full address below

BOTTOM SAFE AREA padding
```

---

### SCREEN 12 — Admin Invoice Flow · `/admin/invoice-flow`

```
Design an enterprise-grade mobile invoice flow / kanban screen for "Agorich Pharma" admin. Mobile 390×844px, dark theme.

TOP BAR:
- "Invoice Flow" DM Serif Display 20px white
- Right: view toggle buttons (Board/Table/List icons, 3 small icon buttons in a pill bg-slate-800)
- Below: search bar full-width + Export button (ArrowSquareOut, outlined, small)

SUMMARY CHIPS ROW (horizontal scroll):
- Total: ₹84.2L (white)
- Paid: ₹61.0L (emerald) 
- Outstanding: ₹23.2L (amber)
Each in glass chip (bg-white/5, border, rounded-xl, icon+amount+label)

VIEW: BOARD MODE (default, horizontal swipeable columns):
Each status column: 300px wide, full height, paginated horizontal scroll
Column header: status name (DRAFT/SENT/PROCESSING/PACKING/DELIVERED/PAID) + count badge + color-coded left border
- DRAFT: slate border
- SENT: blue border  
- PROCESSING: amber border
- PACKING: orange border
- DELIVERED: cyan border
- PAID: emerald border

Invoice cards in each column (bg-slate-800/80, rounded-2xl, 110px, border-l-4 matching column color):
- Invoice # in cyan monospace 12px
- Retailer name white 14px semibold
- Amount: DM Serif Display 18px white
- Date: slate-500 12px
- Action: "Confirm Delivery" button only on DELIVERED column (emerald, compact)

VIEW: TABLE MODE (when toggled):
Compact table rows, alternating bg-slate-800/40 and transparent, columns: Invoice#, Retailer, Amount, Status chip, Date

BOTTOM TAB BAR: standard 5-tab admin bar
```

---

### SCREEN 13 — Admin Accounts Receivable · `/admin/accounts-receivable`

```
Design an enterprise-grade mobile accounts receivable / AR aging screen for "Agorich Pharma" admin. Mobile 390×844px, dark theme.

TOP BAR:
- "Accounts Receivable" DM Serif Display 18px white
- Right: calendar icon (filter by period), export icon

HERO SUMMARY CARD:
- Full-width, bg-gradient from indigo-900/50 to slate-900, border border-indigo-500/20, rounded-2xl, padding 20px
- "Total Outstanding" label slate-400 13px
- ₹23,40,000 DM Serif Display 32px white
- Trend: "↑ ₹2.1L from last month" amber 13px
- Collection rate progress bar: "72% collected this month" — thin bar, emerald fill, slate bg

AR AGING BUCKETS (stacked cards):
Each bucket card, rounded-2xl, left border color-coded:
- "Current (0–30 days)": emerald border, ₹8.4L, 45 invoices, emerald progress fill
- "30–60 days": amber border, ₹7.2L, 32 invoices, amber fill
- "60–90 days": orange border, ₹4.8L, 18 invoices, orange fill  
- "90+ days (Critical)": red border, ₹3.1L, 9 invoices, red fill + Warning icon
Each card: tap to expand and show retailer list for that bucket

AR AGING BAR CHART:
- Horizontal stacked bar chart (Recharts), 100% width, 80px height
- 4 segments colored per bucket above
- Legend below with color dots + labels

TOP OVERDUE RETAILERS:
- Section header "Highest Outstanding" 
- 3–5 list items: retailer name, days overdue (red chip), amount (amber large)

SECTION: Quick Actions
- "Send Payment Reminders" button (emerald, full-width)
- "Export AR Report" button (outlined cyan, full-width)
```

---

### SCREEN 14 — Admin Alerts · `/admin/alerts`

```
Design an enterprise-grade mobile alerts center for "Agorich Pharma" admin. Mobile 390×844px, dark theme.

TOP BAR:
- "Alerts" DM Serif Display 20px white + "12 active" amber badge pill
- Right: filter icon, mark-all-read text button cyan

FILTER TABS (horizontal scroll, below bar):
- "All (12)", "Critical (3)", "Warning (5)", "Info (4)" — underline-style active tab, cyan indicator

ALERT LIST (scrollable):
Alert cards, stacked, 16px margin:
Each card: rounded-2xl, left border 4px colored by severity, bg-slate-800/70:
  
CRITICAL alert card (red border):
- Top row: "CRITICAL" pill (red bg, white text 10px bold) + timestamp right slate-400
- Icon: WarningOctagon 24px red
- Title: "Low stock: Paracetamol 500mg" white semibold 15px
- Description: "Current stock: 23 units. Reorder level: 50 units." slate-400 13px
- Actions: "View Inventory" (red outline button) + "Dismiss" (ghost)

WARNING alert card (amber border):
- "WARNING" pill amber
- Icon: Warning 24px amber
- Title, description, actions same pattern

INFO alert card (blue border):
- "INFO" pill blue
- Icon: Info 24px blue

EMPTY STATE (if 0 alerts):
- ShieldCheck 64px emerald, "All clear!" DM Serif Display 22px, "No active alerts" slate-400

MICRO-INTERACTIONS:
- Swipe left on card: reveal Dismiss action (red bg, TrashSimple icon)
- Dismiss: card collapses with height animation + opacity fade
- Pull to refresh: standard refresh indicator
```

---

### SCREEN 15 — Admin Notifications · `/admin/notifications`

```
Design an enterprise-grade mobile notification center for "Agorich Pharma" admin. Mobile 390×844px, dark theme.

TOP BAR:
- "Notifications" DM Serif Display 20px white
- Right: "Mark all read" text button cyan-400 14px

FILTER TABS:
- "All", "Unread (8)", "Orders", "Payments", "System" — pill tab style, horizontal scroll

NOTIFICATION LIST:
Grouped by date: "Today", "Yesterday", "Earlier this week" — section headers in slate-500 12px uppercase tracking-wide

Each notification item (border-b border-white/5, 72px min-height, padding 14px 16px):
- Left: avatar circle 40px OR system icon circle 40px (icon matches notification type)
- Center: title (white 14px semibold if unread, slate-300 if read) + body preview (slate-400 13px, 2 lines) + timestamp (slate-500 11px)
- Right: unread dot (8px cyan filled circle) on unread items
- Unread items: left bg-tint (bg-cyan-500/3) very subtle
- Types with icons:
  * New order: ShoppingCart cyan circle bg
  * Payment received: CheckCircle emerald circle bg
  * Alert: Warning amber circle bg
  * System: Gear slate circle bg
  * New retailer: Storefront blue circle bg

MICRO-INTERACTIONS:
- Tap: mark as read (dot fades, bg-tint fades), then navigate to relevant screen
- Swipe left: delete action (red)
- Pull to refresh
- "Mark all read" tap: all dots fade out simultaneously with stagger animation
```

---

### SCREEN 16 — Admin Settings · `/admin/settings`

```
Design an enterprise-grade mobile settings screen for "Agorich Pharma" admin. Mobile 390×844px, dark theme.

TOP BAR:
- "Settings" DM Serif Display 20px white

PROFILE CARD (top):
- Gradient card (slate-800 to slate-900), rounded-2xl, padding 20px
- Avatar circle 56px cyan gradient bg, initials white 20px bold
- Admin name DM Serif Display 20px white
- "Super Admin" role chip (cyan bg, white text, ShieldStar icon)
- Email slate-400 13px
- "Edit Profile" button: outlined cyan, 36px rounded-xl

SETTINGS SECTIONS (grouped list, each section has header):

SECTION "Platform":
- row items (72px each, border-b border-white/5, horizontal layout):
  * Notification Preferences (Bell) → ChevronRight
  * Alert Thresholds (SlidersHorizontal) → ChevronRight  
  * AI Agent Config (Robot) → ChevronRight
  * Invoice Templates (FileText) → ChevronRight

SECTION "Display":
  * Dark Mode (Moon) → Toggle switch (cyan when on)
  * Language (Translate) → "English" chip + ChevronRight
  * Currency Format (CurrencyInr) → "INR ₹" chip + ChevronRight

SECTION "Security":
  * Change Password (LockSimple) → ChevronRight
  * Two-Factor Auth (ShieldCheck) → Toggle (emerald when on)
  * Active Sessions (DeviceMobile) → "2 devices" + ChevronRight

SECTION "Data":
  * Export All Data (Export) → ChevronRight
  * System Logs (ClipboardText) → ChevronRight

DANGER ZONE (red section header):
  * "Sign Out" — red text, ArrowSquareOut icon left, full row tap
  * "Deactivate Account" — red text, Warning icon

MICRO-INTERACTIONS:
- Toggle switches: spring animation, haptic-like bounce
- Row tap: scale 0.98, navigate
- Danger actions: confirmation dialog
```

---

## 📦 DISTRIBUTOR SCREENS

---

### SCREEN 17 — Distributor Dashboard · `/distributor`

```
Design an enterprise-grade mobile distributor dashboard for "Agorich Pharma". Mobile 390×844px, dark theme. This is the home screen for the Distributor role.

TOP BAR:
- Left: "Good morning," DM Sans 13px slate-400 / "Raj Pharma Co." DM Serif Display 18px white (stacked)
- Right: notification bell with badge + avatar 32px

HERO GREETING CARD:
- Full-width, bg-gradient from cyan-900/30 to slate-900, border border-cyan-500/15, rounded-2xl, padding 20px
- "Today's Snapshot" label cyan 12px uppercase tracking-wide
- 3-metric row: Pending Orders (amber), Today's Revenue (emerald), Stock Alerts (red)
- Each metric: icon + number large + label small

SECTION: Quick Actions (2×2 grid):
Cards 160px × 80px, rounded-2xl, icon 28px top-left, label bottom:
- "Create Invoice" → Plus + Cyan gradient card
- "Manage Inventory" → Package + Indigo card  
- "Routed Orders" → ArrowsClockwise + Amber card
- "Settlements" → Scales + Emerald card

SECTION: Recent Invoices (horizontal scroll cards OR stacked list):
Invoice cards (if horizontal scroll: 200px wide each):
- Invoice # (cyan monospace 11px)
- Retailer name (white semibold 14px)  
- Amount: DM Serif Display 20px white
- Status chip (color-coded)
- Date slate-500 11px
- "View →" text link cyan

SECTION: Expiry Watchlist Alert Banner (if items near expiry):
- Amber banner: Warning icon + "3 products expire within 30 days" + "Review →" link
- Rounded-xl, bg-amber-500/10, border border-amber-500/20

BOTTOM TAB BAR (5 tabs):
Home, Inventory, Orders, Invoices, Settings — standard dark style, active cyan

FLOATING ACTION BUTTON:
- 56px circle, bottom-right above tab bar, bg-gradient cyan-to-blue
- Plus icon white 24px, shadow glow cyan
- Tap → shows action menu (Create Invoice / Add Product) with slide-up overlay
```

---

### SCREEN 18 — Distributor Create Invoice · `/distributor/create-invoice`

```
Design an enterprise-grade mobile create invoice screen for "Agorich Pharma" distributor. Mobile 390×844px, dark theme. This is a two-phase split interface.

PHASE 1: PRODUCT SELECTION (full screen)

TOP BAR:
- "Create Invoice" DM Serif Display 18px white
- Right: cart icon (ShoppingCart) with item count badge (cyan)
- "Step 1 of 2" progress text slate-400 12px

RETAILER SELECTOR (if needed):
- "Billing to:" label + retailer selector chip row: tapping opens a bottom sheet with search+list of retailers
- Selected: Business name + avatar circle in a cyan-bordered pill

SEARCH BAR:
- Full-width, bg-slate-800, rounded-xl, 48px, MagnifyingGlass, "Search medicines, batch, manufacturer..."

FILTER ROW:
- Category chips (horizontal scroll): "All", "Tablets", "Capsules", "Syrup", "Injection", "Topical"

PRODUCT GRID / LIST (toggleable):
Product cards (LIST mode, stacked):
- 80px height each, border-b border-white/5
- Left: product name white 14px semibold + manufacturer slate-400 12px + category chip
- Center: MRP ₹XX (slate strikethrough) / Agorich ₹XX (cyan)
- Right: quantity stepper (minus/plus 32px buttons with cyan outline, count center white 14px) OR "Add" button (cyan, 64px × 32px rounded-xl)
- Stock: "Stock: 240 units" emerald 11px

STICKY BOTTOM BAR:
- bg-slate-900, border-t border-white/5, padding 12px 16px
- "3 items · ₹4,820" left (items in cyan, amount in DM Serif Display white 18px)
- "Preview Invoice →" right (gradient cyan-blue button 120px × 44px rounded-xl)

PHASE 2: INVOICE PREVIEW (slide-up full screen)
- Invoice preview panel: white background (for print-like view), A4-proportioned scroll view
- Invoice header: Agorich Pharma logo + distributor info + retailer info
- Items table: clean rows with product, qty, rate, amount, GST%
- Tax summary: CGST + SGST / IGST breakdown
- Grand total: bold right-aligned
- Action buttons at bottom (on dark bar): "Save Draft" (outlined), "Send to Retailer" (gradient), "Pay Now" (emerald Razorpay)

MICRO-INTERACTIONS:
- Add product: card briefly flashes cyan, count badge on cart increments with spring bounce
- Remove: reverse animation
- Phase transition: invoice panel slides up from bottom with spring
```

---

### SCREEN 19 — Distributor Inventory · `/distributor/inventory`

```
Design an enterprise-grade mobile inventory management screen for "Agorich Pharma" distributor. Mobile 390×844px, dark theme.

TOP BAR:
- "Inventory" DM Serif Display 20px white + "342 products" slate-400 sub
- Right: filter icon + export icon (ArrowSquareOut)

SEARCH BAR:
- Full-width, rounded-xl, bg-slate-800, "Search by name, batch, manufacturer..."

FILTER CHIPS (horizontal scroll):
"All", "Active", "Inactive", "Low Stock" (amber), "Expiring" (red)

SORT CONTROL:
- "Sort: Name A–Z" pill chip → tap cycles through sorting options

INVENTORY LIST (scrollable):
Each product card (stacked, bg-slate-800/60, rounded-xl, 100px, padding 14px 16px, border border-white/5):
- LEFT: category icon (Pill, Syringe, Eyedrop) in 40px circle bg-slate-700
- CENTER:
  * Product name: white semibold 15px, truncated
  * Manufacturer: slate-400 12px
  * Batch: JetBrains Mono 11px slate-500 + Expiry date
  * Price row: MRP ₹XX slate strikethrough / Agorich ₹XX cyan / Distributor ₹XX emerald
- RIGHT:
  * Stock count: large DM Serif Display 22px (red if low, emerald if healthy)
  * "units" label slate-500 11px
  * Active toggle: small switch (cyan on / slate off)
- BOTTOM ROW (on expand / always visible): "Edit" text button cyan + "Delete" text button red/slate

STATUS INDICATORS on card:
- Low stock: amber left border + "Low Stock" chip
- Expiring soon: red left border + "Exp: 14 days" chip
- Inactive: grayscale card (opacity 60%)

FLOATING ACTION BUTTON:
- 56px, bottom-right, bg-gradient cyan-blue, Plus icon
- Tap → navigate to New Product form

MICRO-INTERACTIONS:
- Toggle active: instant UI update + toast "Product activated/deactivated"
- Swipe left: reveal Edit (cyan, PencilSimple) and Delete (red, Trash) action buttons
- Delete: confirmation dialog before action
```

---

### SCREEN 20 — Distributor Inventory Edit · `/distributor/inventory/edit/[id]`

```
Design an enterprise-grade mobile product edit screen for "Agorich Pharma" distributor inventory. Mobile 390×844px, dark theme.

TOP NAV:
- Back arrow left, "Edit Product" DM Serif Display 18px center, "Save" text button cyan right

PRODUCT HEADER:
- Category icon 48px circle (Pill/Syringe/etc.) bg-slate-700, center top
- Product name (editable inline — tap to edit, transforms to input field with underline animation)

FORM (scrollable, sections separated by thin dividers):

SECTION "Basic Info":
- Product Name (input, pre-filled)
- Category (bottom sheet selector with category icons)
- Manufacturer (input with autocomplete dropdown)

SECTION "Pricing":
- MRP ₹: currency input (₹ prefix chip, number input)
- Agorich Price ₹: same style
- Distributor Price ₹: same style
- Price comparison visual: 3-bar mini chart showing relationship between prices

SECTION "Stock & Batch":
- Current Stock (number input, stepper +/- buttons)
- Batch Number (monospace input)
- Expiry Date (date picker bottom sheet with calendar, shows days remaining chip after selection)

SECTION "Status":
- Active toggle (full-width row with label left, toggle right)

SAVE BUTTON:
- Sticky bottom bar: "Save Changes" full-width gradient cyan-blue 56px button
- "Cancel" ghost button below

MICRO-INTERACTIONS:
- Inline name edit: smooth border appearance + keyboard focus
- Expiry date: calendar slides up from bottom in glass bottom sheet
- Pricing inputs: real-time margin% calculation shows below prices ("Margin: 18.5%")
- Save: loading state → success checkmark animation → toast → navigate back
```

---

### SCREEN 21 — Distributor Inventory New · `/distributor/inventory/new`

```
Design an enterprise-grade mobile "Add New Product" form for "Agorich Pharma" distributor. Mobile 390×844px, dark theme.

TOP NAV:
- Back arrow left (discards with confirmation), "Add Product" DM Serif Display 18px center, "Save" text button cyan (disabled until required fields filled)

EMPTY STATE HERO (top of form):
- Category selector displayed as icon grid (2×3): Pill, Capsule, Syringe, Syrup, Drops, Other — tap selects, selected one glows cyan, others dim
- "Select product category" DM Sans 14px slate-400 centered

FORM SECTIONS (identical structure to Edit but all blank):

PROGRESS INDICATOR:
- Subtle "4 of 8 fields completed" progress text + thin progress bar below the top nav

SMART SUGGESTIONS:
- After typing manufacturer name: "Quick-fill from existing products?" suggestion bar appears with matched products to copy details from

REQUIRED FIELD INDICATORS:
- Small red asterisk on required field labels
- Counter "4 required fields remaining" updates as user fills form

SAME SECTION STRUCTURE AS EDIT SCREEN:
Basic Info → Pricing → Stock & Batch → Status toggle

BOTTOM:
- "Create Product" full-width emerald gradient 56px button — disabled (slate) until all required fields valid, enables with spring animation
- "Save as Draft" ghost button below
```

---

### SCREEN 22 — Distributor Invoices · `/distributor/invoices`

```
Design an enterprise-grade mobile invoice listing screen for "Agorich Pharma" distributor. Mobile 390×844px, dark theme.

TOP BAR:
- "Invoices" DM Serif Display 20px white
- Right: search icon, filter icon

SUMMARY ROW (horizontal chips):
- "Total: ₹84.2L" / "Paid: ₹61L" (emerald) / "Pending: ₹23.2L" (amber) — scrollable glass chips

FILTER TABS (scrollable pills):
"All", "DRAFT" (slate), "SENT" (blue), "PROCESSING" (amber), "PACKING" (orange), "DELIVERED" (cyan), "PAID" (emerald)

INVOICE LIST (scrollable):
Each invoice card (bg-slate-800/70, rounded-2xl, border border-white/5, padding 16px, margin-bottom 10px):
- TOP: Invoice # (cyan JetBrains Mono 12px bold) + Status chip right (color-coded) + "3 days ago" slate-500 11px far right
- MIDDLE: Retailer name (white semibold 16px) + city slate-400
- BOTTOM ROW: amount (DM Serif Display 22px white) + Items count chip + action button

Action buttons vary by status:
- DRAFT: "Edit" (cyan outlined) + "Send" (cyan filled)
- SENT: "Track" (blue outlined)
- DELIVERED: "Confirm" (emerald filled)
- PAID: "View" (ghost)

EMPTY STATE (per filter):
Matching icon (FileX, etc.) + "No [status] invoices" + relevant CTA

MICRO-INTERACTIONS:
- Status chips: tap filters with slide-left list transition
- Card tap: navigate to invoice detail with slide-left
- Swipe reveal on DRAFT: "Delete" red
```

---

### SCREEN 23 — Distributor Routed Orders · `/distributor/routed-orders`

```
Design an enterprise-grade mobile routed orders screen for "Agorich Pharma" distributor. Mobile 390×844px, dark theme. These are orders from retailers waiting for accept/reject.

TOP BAR:
- "Routed Orders" DM Serif Display 18px white + "5 pending" amber badge
- Right: refresh icon (ArrowsClockwise, animated spin on refresh)

FILTER TABS:
- "Pending (5)", "Accepted", "Rejected" — pill tabs, amber active for Pending, emerald for Accepted

ORDER CARDS (prominent, decision-required design):
Each card — bg-slate-800/80, rounded-2xl, border-2 border-amber-500/20 (for pending), 130px, padding 16px:

TOP ROW:
- Order # (cyan monospace) + "Received 2h ago" slot/time (slate-400 12px) + urgency indicator if time-sensitive

RETAILER INFO:
- Storefront icon + Retailer business name (white semibold 16px)
- MapPin + city, distance "2.3 km away" slate-400 13px

ORDER DETAILS:
- Items count chip + Total items chip + "₹12,400" DM Serif Display 22px white
- Items preview: "Paracetamol 500mg × 100, Amoxicillin × 50..." slate-400 13px truncated
- "View all items →" cyan text link (expands inline with animation)

ACTION BUTTONS (2 buttons full-width row):
- "Reject" button: 45% width, red-500/20 bg, red-400 border, red-400 text, X icon — tap shows reason bottom sheet
- "Accept" button: 50% width, gradient emerald, white text, CheckCircle icon — tap shows confirm + delivery date picker

ACCEPTED card state:
- border-emerald-500/20, checkmark icon, "Accepted · Assign to logistics →" link

MICRO-INTERACTIONS:
- Accept: card transforms (border turns emerald, content updates) with spring animation
- Reject: card slides out with swipe-away effect
- Countdown timer on urgent orders: live updating clock chip (red when <1h remaining)
```

---

### SCREEN 24 — Distributor Checkout · `/distributor/checkout`

```
Design an enterprise-grade mobile checkout screen for "Agorich Pharma" distributor. Mobile 390×844px, dark theme. 3-step checkout wizard.

STEP PROGRESS BAR (top, below nav):
3 segments: "Delivery" → "Review" → "Payment" — icon + label per step

TOP NAV:
- Back arrow, "Checkout" DM Serif Display 18px, step indicator "2 of 3"

STEP 1 — Delivery Details:
- Delivery Address: full address card (bg-slate-800, rounded-xl, MapPin icon cyan, address text white) with "Change" link cyan
- Contact Phone: Phone icon input, +91 prefix
- Delivery Date: CalendarBlank icon, date picker field (tapping opens calendar bottom sheet, highlighted cyan on selected date)
- Order Notes: Textarea (bg-slate-800, 80px height, rounded-xl, placeholder "Any special delivery instructions...")

STEP 2 — Order Review:
- Items list: each line item (product name + qty + unit price + line total), scrollable, clean rows
- Summary panel (sticky bottom card):
  * Subtotal, GST (CGST + SGST), Delivery Charge, Total
  * Each row: label left slate-400 + amount right white
  * Grand Total row: bold, larger font, cyan text for amount

STEP 3 — Payment:
- Payment method cards (select-one radio style, each card):
  * "Pay Later (Credit)" — Bank icon, cyan border when selected
  * "Pay via Razorpay" — Razorpay logo + "UPI / Card / Net Banking", cyan gradient border when selected
  * "Cash on Delivery" — Money icon
- Selected card: cyan border + checkmark top-right

STICKY BOTTOM:
- "Place Order" full-width 56px gradient button
- Amount reminder: "₹14,820 + GST" above button slate-400
```

---

### SCREEN 25 — Distributor Logistics · `/distributor/logistics`

```
Design an enterprise-grade mobile logistics management screen for "Agorich Pharma" distributor. Mobile 390×844px, dark theme.

TOP BAR:
- "Logistics" DM Serif Display 20px white
- Right: filter icon

OVERVIEW STATS ROW (3 horizontal chips):
- "In Transit: 8" (cyan) / "Pending Dispatch: 5" (amber) / "Delivered Today: 12" (emerald)

MAP VIEW (optional toggle):
- "Map View" toggle chip top-right of content: shows a dark-style map with delivery pins as colored dots (amber=pending, cyan=in-transit, emerald=delivered)
- Toggle switches between map and list view

LIST VIEW (default, scrollable):
Logistics cards (bg-slate-800/60, rounded-2xl, border border-white/5, padding 16px):

PENDING DISPATCH card:
- "PENDING DISPATCH" chip (amber, top-right)
- Invoice # + Retailer name + address
- Items summary + Total weight (if available)
- "Assign to Logistic Agent" button: outlined cyan, full-width

IN TRANSIT card:
- "IN TRANSIT" chip (cyan) + truck icon
- Delivery agent name + phone (tappable)
- ETA chip: "Est. 2:30 PM today" or overdue (red)
- Progress bar: Dispatched → In Transit → Delivered (step progress, 60% filled)
- "Track" button: map pin icon + cyan text

DELIVERED card:
- "DELIVERED ✓" chip (emerald)
- Delivery time stamp
- Recipient signature indicator (CheckCircle)

FLOATING ACTION: "Add Shipment" FAB bottom-right (Package icon, cyan)
```

---

### SCREEN 26 — Distributor Payables · `/distributor/payables`

```
Design an enterprise-grade mobile payables/settlements dashboard for "Agorich Pharma" distributor. Mobile 390×844px, dark theme.

TOP BAR:
- "Payables & Settlements" DM Serif Display 16px white (compact)
- Right: filter icon, export icon

BALANCE SUMMARY CARD:
- Full-width, bg-gradient from indigo-900/40 to slate-900, border border-indigo-400/20, rounded-2xl, padding 20px
- "Amount Payable to Agorich" label slate-400 13px
- ₹8,42,000 DM Serif Display 36px white
- Due date: "Due by 31 July 2025" amber chip (CalendarBlank icon)
- "Pay Now" button: full-width emerald gradient 52px (Razorpay gateway)

SECTION: Payment History (tabs):
- "Pending" / "Completed" / "All" — pill tab row
  
SETTLEMENT CARDS:
bg-slate-800/60, rounded-xl, border border-white/5:
- Settlement # (monospace cyan) + Date
- Amount: DM Serif Display 20px
- Status: PENDING (amber chip) / COMPLETED (emerald chip) / OVERDUE (red chip)
- "View Details" ChevronRight

PENDING card: extra detail — "Overdue by 3 days" red chip if applicable, "Pay Now" inline button

SECTION: Credit Limit Indicator:
- Titled "Credit Limit"
- Large progress bar (full width, 8px height, rounded-full)
- Used ₹8.4L (cyan fill) of ₹15L limit (slate bg)
- "56% used" text below bar
- "₹6.6L available" slate-400

MICRO-INTERACTIONS:
- Pay Now: opens Razorpay bottom sheet overlay
- Settlement card tap: expand details with animated accordion
```

---

### SCREEN 27 — Distributor Expiry Watchlist · `/distributor/expiry-watchlist`

```
Design an enterprise-grade mobile expiry watchlist screen for "Agorich Pharma" distributor. Mobile 390×844px, dark theme.

TOP BAR:
- "Expiry Watchlist" DM Serif Display 18px white + "⚠ 14 items" amber badge
- Right: filter icon, sort icon

ALERT BANNER (full-width):
- bg-red-900/20, border border-red-500/20, rounded-xl
- WarningOctagon red icon + "3 products expire within 7 days — Immediate action required"
- "View Critical" red text button right

FILTER CHIPS:
"All", "Critical (<7 days)" (red), "Soon (<30 days)" (amber), "Moderate (<60 days)" (slate)

SORT TOGGLE:
"Sort by: Expiry Date ↑" small pill chip

PRODUCT CARDS (scrollable):
Each card — rounded-2xl, left border color (red=critical, amber=soon, slate=moderate), bg-slate-800/70, padding 16px:

TOP ROW:
- Expiry countdown chip right: "⚠ EXPIRES IN 4 DAYS" (red pill) / "27 DAYS" (amber) / "45 DAYS" (slate)

PRODUCT INFO:
- Product name white semibold 16px
- Manufacturer slate-400 12px
- Batch # (JetBrains Mono slate-500 11px) + Expiry date full (bold white 14px)

INVENTORY:
- "Stock: 240 units" + "Estimated loss: ₹4,800" (red, if expired)

ACTION BUTTONS:
- "Mark Handled" ghost button + "Create Discount Invoice" cyan outlined button (to offload stock)

EMPTY STATE:
- CheckCircle 64px emerald, "All products are within safe expiry range", slate-400 sub

MICRO-INTERACTIONS:
- Critical cards have a subtle red pulse glow on left border
- "Mark Handled" → confirmation dialog → card slides out
```

---

### SCREEN 28 — Distributor Settings · `/distributor/settings`

```
Design an enterprise-grade mobile settings screen for "Agorich Pharma" distributor. Mobile 390×844px, dark theme.

[Same structural pattern as Admin Settings — Screen 16 — but with distributor-specific sections]

PROFILE CARD:
- Business avatar (first letter of business name, 56px, cyan gradient circle)
- Business name DM Serif Display 20px white
- "Distributor" role chip (indigo bg, white)
- GSTIN: JetBrains Mono slate-400 12px
- "Edit Profile →" cyan outlined button

SETTINGS SECTIONS:

"Business":
- Business Info (Building) → ChevronRight
- Bank Details (Bank) → ChevronRight
- GST Settings (ReceiptTax) → ChevronRight
- Pricing Rules (Tag) → ChevronRight

"Operations":
- Delivery Settings (Truck) → ChevronRight
- Notification Preferences (Bell) → Toggle / ChevronRight
- Low Stock Threshold (Warning) → current value chip + ChevronRight
- Expiry Alert Days (CalendarX) → current value chip + ChevronRight

"Display":
- Dark Mode → Toggle
- Language → chip + ChevronRight

"Support":
- Help Center → ChevronRight
- Contact Support → ChevronRight
- FAQs → ChevronRight

"Account":
- Sign Out (red text, ArrowSquareOut icon)

BOTTOM: app version "Agorich Pharma v2.4.1" centered slate-600 11px
```

---

### SCREEN 29 — Distributor Support · `/distributor/support`

```
Design an enterprise-grade mobile support / help center screen for "Agorich Pharma" distributor. Mobile 390×844px, dark theme.

TOP BAR:
- "Help & Support" DM Serif Display 20px white

HERO CARD:
- bg-gradient from cyan-900/30 to slate-900, rounded-2xl, padding 20px, center-aligned
- Headset icon 48px cyan
- "How can we help?" DM Serif Display 22px white
- "Our team is available Mon–Sat, 9AM–6PM" slate-400 13px

SEARCH BAR:
- "Search FAQs..." full-width bg-slate-800 rounded-xl

QUICK CONTACT CARDS (2-column grid):
- "Call Us" (Phone emerald, +91-XXXX-XXXXXX tap-to-call)
- "WhatsApp" (WhatsappLogo green, direct message)
- "Email" (EnvelopeSimple cyan, mailto)
- "Live Chat" (Chat cyan, opens chat widget)
Each: rounded-2xl, bg-slate-800/60, icon 32px, label below, tap glow

SECTION: Popular FAQs (accordion):
- "How do I create an invoice?" → expand for answer
- "How to add a new product?"
- "How to handle a routed order?"
- "Payment and settlement process?"
Each FAQ: row with Question DM Sans white + ChevronDown icon, expands to reveal answer text slate-400

SECTION: Raise a Ticket:
- "Submit a Support Ticket" full-width outlined button (cyan, 52px)

SECTION: Video Tutorials:
- Horizontal scroll of tutorial thumbnails (rounded-xl, 160px wide, play button overlay)
```

---

### SCREEN 30 — Distributor Referrals · `/distributor/referrals`

```
Design an enterprise-grade mobile referral dashboard for "Agorich Pharma" distributor. Mobile 390×844px, dark theme.

TOP BAR:
- "Referrals & Rewards" DM Serif Display 18px white (or just "Rewards" for compact)
- Right: Gift icon cyan

HERO CARD (referral code spotlight):
- Full-width, bg-gradient from violet-900/40 to slate-900, border border-violet-500/20, rounded-2xl, padding 20px
- "Your Referral Code" label violet-300 12px uppercase tracking
- Code: "RAJ-PHR-4821" DM Serif Display 28px white letter-spacing-wide
- Referral link (truncated, tap to copy): Copy icon right (tap → "Copied!" toast)
- Share button row: WhatsApp (green), SMS (blue), Copy (slate) — icon+label pill buttons

STATS GRID (2×2):
- Total Referrals: 24 (violet large)
- Active Referrals: 18 (emerald)
- Total Earnings: ₹4,200 (cyan)
- Pending Reward: ₹800 (amber)

TAB ROW:
"Referrals" | "Earnings" | "Leaderboard" | "Achievements"

TAB: REFERRALS list:
Each row: referred business name + status chip (Active=emerald, Pending=amber) + date + earned amount (emerald if earned)

TAB: EARNINGS:
Chart (bar chart, monthly earnings) + list of earning transactions

TAB: LEADERBOARD:
Top 5 distributors: rank (1=gold medal, 2=silver, 3=bronze) + business name + total referred + prize

TAB: ACHIEVEMENTS:
Badge grid: earned badges (full color) vs locked (grayscale lock icon) — StarFour, TrophySimple, MedalSimple icons in various sizes

QR CODE button (sticky bottom):
"Show QR Code" button → full-screen modal with large QR code + share options
```

---

## 🛒 RETAILER SCREENS

---

### SCREEN 31 — Retailer Dashboard · `/retailer`

```
Design an enterprise-grade mobile retailer dashboard for "Agorich Pharma". Mobile 390×844px, dark theme. Warm emerald accent for retailer role (vs cyan for distributor).

TOP BAR:
- "Hi, Ramesh 👋" DM Serif Display 18px white (left)
- Right: notification bell badge + avatar 32px

BUSINESS SNAPSHOT CARD:
- bg-gradient from emerald-900/30 to slate-900, border border-emerald-500/15, rounded-2xl, padding 20px
- "Sunshine Medical Store" DM Serif Display 16px white
- 3 metrics: Pending Orders (amber), This Month's Spend (emerald), Invoices Due (red)

QUICK ACTIONS (2×2 grid, prominent):
- "Order Now" → ShoppingCart, emerald gradient card (most prominent)
- "My Invoices" → FileText, indigo card
- "Browse Products" → Pill, blue card
- "My Cart" → ShoppingCartSimple + badge count, amber card

SECTION: Recent Orders (stacked cards):
Order card (80px, bg-slate-800/60, rounded-xl):
- Order/Invoice # (emerald monospace 11px) + Status chip right
- Distributor name slate-400 12px
- Amount DM Serif Display 18px white + item count chip
- "View →" link emerald right

SECTION: Nearby Distributors (horizontal scroll):
Distributor chips (140px, rounded-xl, bg-slate-800):
- Business name 13px white
- Distance "1.2 km" MapPin slate-400
- "3 products match" hint 11px emerald
- Tap → goes to product listing

BOTTOM TAB BAR (5 tabs — retailer specific):
Home, Order, Invoices, Cart (with item count badge), Profile
Active: emerald (vs cyan for other roles)
```

---

### SCREEN 32 — Retailer Create Invoice · `/retailer/create-invoice`

```
Design an enterprise-grade mobile "Create Order" (invoice creation) screen for "Agorich Pharma" retailer. Mobile 390×844px, dark theme. Emerald accent for retailer.

PHASE 1: SELECT DISTRIBUTOR (full screen, if none selected)

TOP BAR: "Choose Distributor" DM Serif Display 18px white
Search: "Search distributor by name or area..."
Radius filter: "Within: 5 km" slider pill (tap → bottom sheet radius slider 1–50km)

Distributor cards (vertical list):
- Business name white semibold 16px + "VERIFIED" emerald chip if verified
- MapPin + "2.3 km away" slate-400
- "Available products: 342" emerald small
- Star rating + review count
- "Select" button: emerald outlined 36px

PHASE 2: PRODUCT SELECTION (after distributor selected)
(Same pattern as Distributor Create Invoice — Screen 18 — but emerald accent)
- "Ordering from: [Distributor Name]" top banner (emerald bg-10%, text white, "Change" link)
- Product search + categories
- Product cards with add to cart functionality
- Cart preview sticky bottom bar

PHASE 3: INVOICE PREVIEW
- Preview panel (white print view OR dark preview toggle)
- Save / Send to Distributor buttons
- "Send" action: confirmation dialog showing distributor who will receive it

RETAILER-SPECIFIC DIFFERENCES from distributor flow:
- No price editing (prices are set by distributor)
- "Send to [Distributor Name]" CTA instead of "Send to Retailer"
- Nearby distributor recommendation if cart has items not stocked by selected one

MICRO-INTERACTIONS: Same as Screen 18 but with emerald highlights
```

---

### SCREEN 33 — Retailer Checkout · `/retailer/checkout`

```
Design an enterprise-grade mobile checkout screen for "Agorich Pharma" retailer. Mobile 390×844px, dark theme, emerald accent.

[Identical structure to Distributor Checkout — Screen 24 — but with retailer-specific content and emerald accent color instead of cyan]

KEY DIFFERENCES:
- "Ordering from: Raj Pharma Co." top banner with distributor info
- Delivery Address: retailer's store address auto-filled (from onboarding)
- Payment options: "Pay via Razorpay" + "Pay Later (Distributor Credit)" — no COD for B2B
- Step 2 Review: shows distributor name + items with distributor pricing
- Order confirmation CTA: "Place Order" → emerald gradient button
- Post-order: animated success screen with order number + "Your order has been sent to [Distributor]" + "Track Order" and "Back to Home" buttons
```

---

### SCREEN 34 — Retailer Invoices · `/retailer/invoices`

```
Design an enterprise-grade mobile invoice history screen for "Agorich Pharma" retailer. Mobile 390×844px, dark theme, emerald accent.

[Similar structure to Distributor Invoices — Screen 22 — but retailer perspective]

KEY DIFFERENCES:
- Shows distributor name (not retailer name) on each invoice card
- Status chips from retailer POV: ORDERED → PROCESSING → PACKING → DELIVERED → PAID
- Action buttons: "Track" (in-transit), "Pay Now" (Razorpay, on delivered), "View Details"
- Summary row: "This Month: ₹24,800 spent" emerald + "Outstanding: ₹8,200" amber
- "Pay Outstanding" prominent button top area (emerald gradient) if any outstanding

INVOICE CARDS (emerald left border on PAID, amber on OUTSTANDING):
Same structure but from buying perspective.

FILTER TABS:
"All", "Active", "Delivered", "Paid", "Outstanding" (amber badge)
```

---

### SCREEN 35 — Retailer Inventory · `/retailer/inventory`

```
Design an enterprise-grade mobile product catalog / inventory browsing screen for "Agorich Pharma" retailer. Mobile 390×844px, dark theme, emerald accent.

TOP BAR:
- "Browse Products" DM Serif Display 20px white
- Right: cart icon (ShoppingCart, emerald) with badge + layout toggle (List/Grid)

DISTRIBUTOR SELECTOR (top):
- "Browsing: Raj Pharma Co." chip with ArrowsLeftRight icon (change distributor)
- Full-width banner, bg-emerald-900/20 border border-emerald-500/10

SEARCH + FILTER:
- Search bar full-width
- Filter chips: All, Tablets, Capsules, Syrup, Injection, etc. (horizontal scroll)
- Sort: "Price: Low to High" pill toggle

GRID VIEW (2-column, default):
Each product card — rounded-2xl, bg-slate-800/70, 180px each:
- Category icon or product image placeholder (top, 80px, bg-slate-700 rounded-xl)
- Product name white 13px semibold (2 lines)
- Manufacturer slate-400 11px
- Price: "₹42.50" emerald semibold 16px
- Stock indicator: "In Stock" emerald dot OR "Low Stock" amber dot OR "Out of Stock" red
- "Add to Cart" button: small emerald 32px full-width bottom of card

LIST VIEW (toggle):
Compact 72px rows, same info in single line format, quantity stepper right

PRODUCT DETAIL (tap on card → slide-up modal or new screen):
Full product detail with description, batch, expiry, pricing, quantity selector, "Add to Cart" CTA
```

---

### SCREEN 36 — Retailer Settings · `/retailer/settings`

```
Design an enterprise-grade mobile settings screen for "Agorich Pharma" retailer. Mobile 390×844px, dark theme, emerald accent.

[Same structure as Distributor Settings — Screen 28 — but retailer-specific]

PROFILE CARD: emerald gradient avatar, business name, "Retailer" chip (emerald)

SETTINGS SECTIONS:

"Store":
- Store Information (Storefront) → ChevronRight
- Store Location (MapPin) → ChevronRight (with map thumbnail)
- Business Documents (FileText) → ChevronRight

"Ordering":
- Preferred Distributors (Package) → ChevronRight
- Delivery Preferences (Truck) → ChevronRight
- Notification Settings (Bell) → ChevronRight

"Financial":
- Payment Methods (CreditCard) → ChevronRight
- Invoice Templates (Receipt) → ChevronRight

"Display": Dark Mode toggle, Language

"Support": Help Center, Contact Support

"Account": Sign Out (red)
```

---

### SCREEN 37 — Retailer Support · `/retailer/support`

```
Design an enterprise-grade mobile support screen for "Agorich Pharma" retailer. Mobile 390×844px, dark theme, emerald accent.

[Same structure as Distributor Support — Screen 29 — but retailer-specific content]

KEY DIFFERENCES:
- Hero: "How can we help, Ramesh?" personalized
- FAQ items specific to retailer: "How to track my order?", "How to pay an invoice?", "How to refer a friend?", "How to change my distributor?"
- Contact: same quick contact grid
- Ticket form: order # field (if issue is order-related)
- "Chat with Distributor" extra option (opens chat with their preferred distributor)
```

---

### SCREEN 38 — Retailer Referrals · `/retailer/referrals`

```
Design an enterprise-grade mobile referral hub for "Agorich Pharma" retailer. Mobile 390×844px, dark theme, emerald accent.

[Same structure as Distributor Referrals — Screen 30 — but emerald accent and retailer-specific content]

KEY DIFFERENCES:
- Hero card: emerald gradient instead of violet
- "Refer a friend and earn ₹500 for each verified signup" as tagline
- Referral stats: Total Referrals, Verified Retailers, Earnings, Pending
- Leaderboard: other retailers (not distributors)
- Achievements: retailer-specific badges (e.g., "Super Referrer", "Loyalty Champion")
- QR Code: larger display, download option for printing in store

UNIQUE ELEMENT:
- "Loyalty Points" section: points balance in large display + redemption options grid (Discount, Cashback, Free Delivery)
```

---

## 🚚 LOGISTIC SCREENS

---

### SCREEN 39 — Logistic Dashboard · `/logistic`

```
Design an enterprise-grade mobile logistics dashboard for "Agorich Pharma" delivery agent. Mobile 390×844px, dark theme. Orange/amber accent for Logistic role.

TOP BAR:
- "Deliveries" DM Serif Display 20px white + current date slate-400 13px right
- Left: hamburger menu → sidebar OR avatar circle

STATUS OVERVIEW ROW:
3 stat cards (horizontal layout, equal width):
- "Processing: 8" (amber bg-tint, Spinner icon animated spin)
- "Packing: 5" (orange bg-tint, Package icon)
- "To Deliver: 13" (cyan bg-tint, Truck icon)
Total: all numbers in DM Serif Display 28px

PRIORITY QUEUE (PROCESSING cards — needs attention):
Section header: "Needs Attention" amber + count badge

Delivery cards (bg-slate-800/80, rounded-2xl, border-l-4 border-amber-500):
- "PROCESSING" chip amber top-right
- Invoice # + Retailer name (white 16px semibold)
- Retailer address + distance (MapPin slate-400)
- Items count + weight (if available)
- "Mark Packed" button: orange gradient, full-width 44px

PACKING SECTION:
Cards (border-l-4 border-orange-400):
- "PACKING" chip orange
- "Mark Out for Delivery" button (cyan outlined)

OUT FOR DELIVERY (if any):
Cards (border-l-4 border-cyan-500):
- ETA chip
- "Confirm Delivery" button (emerald filled) → opens confirmation modal

FLOATING ACTION:
Route optimization button: "Plan Route" blue FAB with MapTrifold icon

BOTTOM TAB BAR:
Dashboard, Deliveries, Routes, History, Settings — amber active tab
```

---

### SCREEN 40 — Logistic Deliveries · `/logistic/deliveries`

```
Design an enterprise-grade mobile active deliveries screen for "Agorich Pharma" logistic agent. Mobile 390×844px, dark theme, amber accent.

TOP BAR:
- "Active Deliveries" DM Serif Display 18px white + "13 total" amber badge

FILTER TABS:
"Out for Delivery" (cyan), "Packing" (orange), "Processing" (amber), "All"

MAP TOGGLE:
- Top-right: "Map View" button — when active, shows full-width dark map with delivery pin clusters

DELIVERY LIST:
Each delivery card (bg-slate-800/70, rounded-2xl, padding 16px, border border-white/5):
- TOP: priority chip (URGENT/NORMAL) + status chip right
- Customer: Retailer business name white 16px + full address slate-400 14px
- Distance: "3.2 km away" + Waze/Google Maps deep link button (MapPin icon, cyan outlined)
- Items: "8 items · ₹14,200 value" package icon
- TIME: "Scheduled: 2:00–4:00 PM" CalendarClock icon
- STATUS ACTIONS:
  * If PACKING: "Ready for Pickup" button (amber → cyan transition)
  * If OUT FOR DELIVERY: "Confirm Delivery" button (emerald)
  * If delivered: "Delivered ✓" static chip + time

CONFIRM DELIVERY MODAL (bottom sheet):
- "Confirm Delivery" title
- OTP input (4 boxes, JetBrains Mono 28px, auto-advance) OR signature pad
- Photo proof: camera button (full-width outlined button to open camera)
- "Confirm" emerald button

MICRO-INTERACTIONS:
- "Confirm Delivery" → success animation (checkmark draws, card turns emerald), then slides down
```

---

### SCREEN 41 — Logistic Routes · `/logistic/routes`

```
Design an enterprise-grade mobile route planning screen for "Agorich Pharma" logistic agent. Mobile 390×844px, dark theme, amber accent.

TOP BAR:
- "Route Plan" DM Serif Display 18px white + "Today, Jun 7" date right

MAP (full-width, 280px height, rounded-2xl):
- Dark Mapbox-style map
- Colored numbered pins: stop 1 (cyan), stop 2 (amber), stop 3 (orange) etc.
- Route line connecting pins (dashed cyan line with direction arrows)
- Current location pulsing dot (blue)

ROUTE SUMMARY BAR (below map):
- "3 stops · 12.4 km · Est. 1h 45min" in glass pill row
- Truck icon + total details

STOPS LIST (reorderable):
Each stop (draggable by DragHandle icon on left):
- Stop number circle (colored per pin)
- Retailer name white 15px
- Address slate-400 13px
- Distance from previous stop: "2.3 km" slate-500 11px right
- Status: pending/completed chip

ROUTE ACTIONS:
- "Start Navigation" full-width emerald gradient button (opens maps app)
- "Optimize Route" outlined cyan button (AI reorders stops for efficiency)

MICRO-INTERACTIONS:
- Drag reorder: card lifts (shadow grows), list reorders in real-time, pins renumber on map
- Start Navigation: deep link to Google Maps / Waze with waypoints
```

---

### SCREEN 42 — Logistic History · `/logistic/history`

```
Design an enterprise-grade mobile delivery history screen for "Agorich Pharma" logistic agent. Mobile 390×844px, dark theme, amber accent.

TOP BAR:
- "Delivery History" DM Serif Display 18px white
- Right: date range filter (CalendarBlank icon)

MONTHLY SUMMARY CARD:
- "June 2025" month header
- 3 metrics: Deliveries Completed (42, emerald), Avg per day (1.8), On-time rate (94%, emerald)

FILTER:
- Date range chips: "Today", "This Week", "This Month", "Custom"
- "This Month" shows a timeline grouped by date

HISTORY LIST (grouped by date):
Date section headers: "Today (2)", "Yesterday (3)", "Jun 5 (4)" etc. — slate-500 12px uppercase

Completed delivery cards (bg-slate-800/50, rounded-xl, 80px, border-l-4 border-emerald-500):
- "DELIVERED ✓" chip emerald top-right + timestamp right
- Invoice # (monospace) + Retailer name white semibold
- Address slate-400 13px
- "₹14,200 delivered" amount emerald small
- "View Proof" link (if photo captured)

Stats mini-chart:
- Weekly bar chart (last 7 days, delivery count per day, amber bars)
- Below history list

EMPTY STATE (if no history for selected period):
ClockCounterClockwise 64px slate icon, "No deliveries in this period"
```

---

### SCREEN 43 — Logistic Settings · `/logistic/settings`

```
Design an enterprise-grade mobile settings screen for "Agorich Pharma" logistic agent. Mobile 390×844px, dark theme, amber accent.

PROFILE CARD:
- Delivery agent avatar 56px (Truck icon in orange gradient circle)
- Agent name DM Serif Display 20px white
- "Logistic Agent" chip (amber)
- Zone: "Mumbai Central" MapPin slate-400
- "Edit Profile →" outlined amber button

SETTINGS SECTIONS:

"Delivery":
- My Zone / Coverage Area (MapPin) → ChevronRight
- Vehicle Type (Truck) → current value chip + ChevronRight
- Availability Status (ClockClockwise) → Toggle (on=available)
- Navigation App (MapTrifold) → "Google Maps" chip + ChevronRight

"Notifications":
- New Delivery Assigned → Toggle
- Route Changes → Toggle
- Daily Briefing → Toggle

"Display":
- Dark Mode → Toggle
- Language → chip + ChevronRight

"Account":
- Sign Out (red)

BOTTOM: App version
```

---

## 💼 SALES SCREENS

---

### SCREEN 44 — Sales Dashboard · `/sales`

```
Design an enterprise-grade mobile sales dashboard for "Agorich Pharma" sales team member. Mobile 390×844px, dark theme. Purple/violet accent for Sales role.

TOP BAR:
- "Sales Dashboard" DM Serif Display 18px white
- Right: notification bell + avatar

PERFORMANCE CARD (hero):
- Full-width, bg-gradient from violet-900/40 to slate-900, border border-violet-500/20, rounded-2xl, padding 20px
- "June Target" label violet-300 12px + current month
- Target vs Actual progress bar (12px height, rounded-full):
  * violet gradient fill to current (₹18.4L achieved)
  * Remaining portion slate-600
  * Target marker line with "₹25L" label above
- "₹18,40,000 / ₹25,00,000" text (violet large / white normal) below bar
- "73.6% achieved" percentage right
- "₹6.6L to go" slate-400 13px

METRICS GRID (2×3):
- New Retailers this month (violet)
- Active Retailers (emerald)
- Retention Rate (emerald %)
- Avg Order Value (cyan ₹)
- Commission Earned (gold ₹)
- Pending Follow-ups (amber with Warning badge)

TAB: OVERVIEW (default — above content is this tab)

TAB: CUSTOMERS:
Search bar + filter chips (Active/Inactive/High Risk/Follow-up Due)

Customer list cards (bg-slate-800/60, rounded-xl, 100px, padding 14px):
- Avatar circle + Customer name white 15px semibold
- "Health Score" colored badge: Excellent (emerald), Good (cyan), At Risk (amber), Critical (red)
  Circular progress indicator 36px showing score %
- Last order: "18 days ago" slate-500
- Revenue this month: violet semibold
- "Follow-up Due" chip amber if applicable
- "Add Note" + "Call" action buttons (icon only, 32px each)

TAB: PERFORMANCE:
- Monthly bar chart (bar per week, violet bars)
- Commission breakdown table
- Top performing products list

FLOATING ACTION:
"Add Customer" FAB violet gradient + Plus icon

BOTTOM TAB BAR:
Dashboard, Customers, Performance, Settings — violet active
```

---

## 🌐 PUBLIC PAGES

---

### SCREEN 45 — Home / Landing Page · `/`

```
Design an enterprise-grade mobile marketing landing page for "Agorich Pharma" B2B pharmaceutical platform. Mobile 390×844px. Unlike the app (dark theme), this is a marketing page — use a sophisticated light theme with deep navy accents OR a premium dark theme. Choose dark for brand consistency.

HERO SECTION:
- Full-screen: animated dark navy background with a subtle molecular/network particle animation (dots + connecting lines)
- Center: Agorich Pharma logo large (60px display)
- Tagline: "The Future of Pharma Supply Chain" DM Serif Display 32px white, centered, 2 lines
- Sub-tagline: "Connect distributors, retailers, and logistics in one intelligent platform" DM Sans 15px slate-400, centered
- CTA buttons: "Get Started" (full-width, gradient cyan-blue, 56px) + "Book a Demo" (outlined cyan, 52px)

SCROLL INDICATOR: animated chevron-down at bottom of hero

FEATURES SECTION:
- Section header: "Everything you need, in one platform" DM Serif Display 24px white
- Feature cards (stacked vertically, full-width):
  Each: bg-slate-800/60, rounded-2xl, border-l-4 colored, padding 20px
  * Inventory Management (Package, cyan border) — description
  * Invoice Flow (FileText, indigo border)
  * AI Command Center (Robot, violet border)
  * Real-time Logistics (Truck, amber border)
  * Referral System (UsersThree, emerald border)

STATS SECTION:
- bg-gradient from cyan-900/20 to slate-900, rounded-2xl
- 4 stats: "1200+ Retailers", "350+ Distributors", "₹50Cr+ GMV", "99.2% Uptime"
- Each: number DM Serif Display 28px white + label slate-400 13px

TESTIMONIAL (1–2):
- Quote card: glass morphism, avatar + name + quote text italic

CTA SECTION:
- "Ready to transform your pharma business?" + "Get Started Free" button

FOOTER:
- Logo + nav links (About, Privacy, Terms) + © 2025 Agorich Pharma
```

---

### SCREEN 46 — About · `/about`

```
Design an enterprise-grade mobile "About Us" page for "Agorich Pharma". Mobile 390×844px, dark theme.

TOP: back navigation or bottom tab link

HERO:
- "About Agorich" DM Serif Display 28px white, centered
- Cyan underline accent 40px wide, 2px
- "Built for the pharma industry, by people who understand it." slate-400 15px

STORY SECTION:
- "Our Story" section header
- Paragraph text DM Sans 15px slate-300, line-height 1.7
- Timeline (vertical, left-bordered): founding year → milestones (2022 Founded, 2023 1000 users, 2024 Series A, etc.)
  Each milestone: dot (cyan filled circle), year bold white, description slate-400

TEAM SECTION:
- "Our Team" header
- Team member cards (2-column grid): avatar placeholder circle (gradient), name white 14px semibold, role slate-400 12px

VALUES TEASER:
- "See Our Values →" card linking to /values

FOOTER: same as landing page
```

---

### SCREEN 47 — Mission · `/mission`

```
Design an enterprise-grade mobile "Our Mission" page for "Agorich Pharma". Mobile 390×844px, dark theme.

HERO:
- Full-width gradient banner (deep violet-to-navy), 200px height
- "Our Mission" DM Serif Display 32px white centered vertically
- Subtle DNA/molecule illustration SVG overlay (decorative, low opacity)

CONTENT:
- Mission statement: large italic DM Serif Display 22px white, centered, bg-gradient text (cyan-to-violet)
  "To democratize access to pharmaceutical distribution technology for every business in India."
- Supporting paragraphs DM Sans 15px slate-300

PILLARS SECTION:
- "What drives us" header
- 3 pillar cards (stacked, full-width):
  * Transparency (Eye, cyan)
  * Efficiency (Lightning, amber)
  * Accessibility (HandHeart, emerald)
  Each: icon 40px circle, title white 18px DM Serif, description slate-400

IMPACT METRICS (if available):
- "₹50Cr+ medicines distributed monthly" etc.

CTA: "Join our mission →" cyan button
```

---

### SCREEN 48 — Privacy Policy · `/privacy`

```
Design an enterprise-grade mobile Privacy Policy page for "Agorich Pharma". Mobile 390×844px, dark theme.

TOP NAV: back arrow, "Privacy Policy" title DM Serif Display 18px

HEADER:
- "Last updated: June 1, 2025" slate-400 13px
- ShieldCheck 40px cyan icon centered
- "Your privacy is our priority" sub-heading slate-300

TABLE OF CONTENTS (expandable list, tap to scroll to section):
- 1. Information We Collect
- 2. How We Use Your Data
- 3. Data Sharing
- 4. Data Security
- 5. Your Rights
- 6. Contact Us
Each: cyan number + white section name + ChevronRight

CONTENT SECTIONS (scrollable):
Each section has:
- Section heading DM Serif Display 18px white, underline accent
- Body text DM Sans 14px slate-300, line-height 1.7
- Callout boxes for important points: bg-cyan-900/20, border border-cyan-500/20, rounded-xl, padding 14px

STICKY TOP (on scroll): floating current section indicator pill (glass morphism)

CONTACT SECTION:
- "Questions about privacy?" + privacy@agorich.com tap-to-email
```

---

### SCREEN 49 — Terms of Service · `/terms`

```
Design an enterprise-grade mobile Terms of Service page for "Agorich Pharma". Mobile 390×844px, dark theme.

[Identical structure to Privacy Policy — Screen 48 — but with]:
- Title: "Terms of Service"
- Icon: Scales 40px cyan
- Sub: "Please read these terms carefully before using Agorich Pharma"
- TOC sections: Acceptance, Use of Service, Prohibited Activities, Payment Terms, Termination, Limitation of Liability, Governing Law
- Color accent for callout boxes: amber (for warnings/important clauses) instead of cyan
- Download PDF button: full-width outlined cyan button at bottom "Download as PDF"
```

---

### SCREEN 50 — Values · `/values`

```
Design an enterprise-grade mobile "Our Values" page for "Agorich Pharma". Mobile 390×844px, dark theme.

HERO:
- "What We Believe" DM Serif Display 28px white centered
- "The principles that guide every decision we make at Agorich." slate-400 14px centered

VALUES LIST (stacked cards, vertical):
Each value: full-width card, rounded-2xl, padding 24px, unique gradient:
- "Integrity" — violet gradient bg-tint, Heart icon violet, title DM Serif Display 22px white, description paragraph slate-300
- "Transparency" — cyan gradient bg-tint, Eye icon cyan
- "Innovation" — indigo gradient bg-tint, Lightbulb icon indigo
- "Reliability" — emerald gradient bg-tint, ShieldCheck icon emerald
- "Empathy" — rose gradient bg-tint, HandHeart icon rose

Each card: animate on scroll-into-view (slide in from left alternating with right)

BOTTOM QUOTE:
- Large decorative quotation mark (DM Serif Display 72px cyan, opacity 20%)
- "We're building trust, one delivery at a time." DM Serif Display 20px white italic centered

CTA: "Join the Agorich team →" link
```

---

## 💊 MEDICINE / PRODUCT SCREENS

---

### SCREEN 51 — Medicines Listing · `/medicines`

```
Design an enterprise-grade mobile medicines / products catalog page for "Agorich Pharma". Mobile 390×844px, dark theme.

TOP BAR:
- "Medicines" DM Serif Display 20px white
- Right: filter icon, grid/list toggle

CATEGORY SCROLLER (horizontal, icon+label chips):
Icons for each: Pill (Tablets), Capsule (Capsules), Droplet (Syrup), Syringe (Injection), Eye (Eye Drops), Heart (Cardiac), more
Each chip: 70px, rounded-xl, bg-slate-800, icon 20px cyan, label 11px white below

SEARCH BAR:
- Full-width, bg-slate-800, "Search medicine, brand, or condition..."

PRODUCT GRID (2-column):
Each card (rounded-2xl, bg-slate-800/70, 185px, border border-white/5):
- Top area 80px: category-color gradient bg + category icon centered (or product image)
- Product name: white semibold 13px, 2 lines max
- Brand/Manufacturer: slate-400 11px
- MRP: ₹XX.XX white 15px + "₹XX.XX" emerald (agorich price, discounted)
- Discount badge: "23% off" amber top-right corner
- Stock badge: "In Stock" emerald OR "Out of Stock" red (small, absolute top-left)
- "Add to Cart" button: emerald 32px height, full-width bottom of card

LIST VIEW (when toggled):
72px rows, horizontal layout, all same info

PAGINATION / LOAD MORE:
"Load 20 more products" outlined button centered OR infinite scroll
```

---

### SCREEN 52 — Medicine Category · `/medicines/category/[category]`

```
Design an enterprise-grade mobile medicine category page for "Agorich Pharma". Mobile 390×844px, dark theme.

[Identical to Medicines Listing — Screen 51 — but with]:

TOP BAR:
- Back arrow + "[Category Name] Medicines" e.g. "Cardiac Medicines" DM Serif Display 18px white
- Product count: "124 products" slate-400 sub

HERO BANNER (full-width, 100px, no-scroll):
- Category-specific gradient: Cardiac=rose-900, Antibiotics=amber-900, Vitamins=emerald-900, etc.
- Large category icon 40px white centered
- Category name DM Serif Display 20px white

CONTENT:
- Same product grid/list as general medicines page
- Breadcrumb: "Medicines → Cardiac" small slate-400 row below hero
- Sub-category chips below breadcrumb (e.g., for Cardiac: "Beta Blockers", "ACE Inhibitors", "Statins")
```

---

### SCREEN 53 — Medicine Detail · `/medicines/product/[id]`

```
Design an enterprise-grade mobile medicine product detail screen for "Agorich Pharma". Mobile 390×844px, dark theme.

TOP NAV:
- Back arrow left, share icon + cart icon right (with badge)

PRODUCT HERO (full-width, 220px):
- bg-gradient category-color: deep blue-to-navy for "Tablets"
- Large category icon 80px centered (white glow)
- Product name: DM Serif Display 24px white centered, below icon

DETAILS SCROLL CONTENT:

PRICING SECTION (bg-slate-800/80 rounded-2xl):
- MRP: "₹240.00" slate-400 strikethrough
- Agorich Price: "₹198.50" white DM Serif Display 28px + "17% OFF" amber badge
- GST: "Incl. 12% GST" slate-500 11px

PRODUCT INFO SECTION:
- Manufacturer chip (Building icon + name)
- Category chip
- Composition/Salt: "Paracetamol 500mg" monospace cyan
- Pack size: "Strip of 10 tablets"
- Batch: JetBrains Mono + Expiry date

TABS: "Description" | "Dosage" | "Side Effects" | "Storage"
Tab content: DM Sans 14px slate-300, line-height 1.7

QUANTITY SELECTOR:
- "Quantity:" label + stepper (–/+, current count white DM Serif Display 20px center)
- "Minimum order: 1 strip"

ACTION BAR (sticky bottom, above safe area):
- "Add to Cart" button: 50% width, emerald gradient
- "Buy Now" button: 50% width, cyan gradient
- Both 52px height, rounded-xl
```

---

## 📄 INVOICE & UTILITY SCREENS

---

### SCREEN 54 — Invoice View · `/invoice/[id]`

```
Design an enterprise-grade mobile invoice view screen for "Agorich Pharma". Mobile 390×844px. This screen serves dual purpose: in-app preview (dark theme) with a toggle to print preview (white/light theme).

TOP NAV (dark):
- Back arrow left, "Invoice #AG-2024-8823" DM Serif Display 16px center (monospace accent), 3 action icons right: Share (ShareNetwork), Download (DownloadSimple), Print (Printer) — all cyan

INVOICE STATUS BANNER (full-width):
- Status-colored bar: PAID (emerald bg-tint, CheckCircle icon) / PENDING (amber) / OVERDUE (red)
- "PAID · ₹14,820 · Jun 3, 2025" centered in banner

INVOICE CARD (scrollable, white bg for print-like feel, rounded-2xl, shadow glow):

HEADER SECTION (dark card style in app view):
- Agorich Pharma logo + "TAX INVOICE" label DM Serif Display 18px
- Invoice #: JetBrains Mono bold cyan
- Invoice Date + Due Date row

FROM/TO SECTION (two-column):
- FROM: Distributor name + GSTIN + address (right-bordered)
- TO: Retailer name + address

ITEMS TABLE:
- Table header row: Product | Qty | MRP | Rate | GST% | Amount — bg-slate-800, white 12px semibold (in dark view) OR bg-gray-100 (in print view)
- Item rows alternating: product name (14px), all data (13px), line total right
- Subtotals: rows with divider

TAX SUMMARY BOX:
- CGST: % and amount / SGST: % and amount (or IGST if inter-state)
- Subtotal, Tax Total, Grand Total — last row: bold 18px DM Serif Display

GRAND TOTAL BANNER:
- "Grand Total: ₹14,820.00" — large, emerald bg-tint card, DM Serif Display 24px

PAYMENT DETAILS SECTION:
- Bank name, A/C number (masked), IFSC, QR code for payment

FOOTER:
- Terms & Conditions text
- "Authorized Signatory" label + signature line

BOTTOM ACTIONS (sticky, dark bar):
- "Pay Now" (if pending, Razorpay) OR "Download PDF" (if paid) — full-width gradient button
- "Send via Email" outlined button
```

---

### SCREEN 55 — QR Page · `/qr`

```
Design an enterprise-grade mobile QR code screen for "Agorich Pharma". Mobile 390×844px, dark theme.

LAYOUT (centered, full-screen):
- TOP: back arrow + "Scan / Share" title
- CENTER: 
  * Large QR code box: 240px × 240px, white bg, rounded-2xl, padding 16px, border border-white/10 glow shadow cyan
  * QR code is user's business identifier (referral or invoice or product)
  * "AGORICH" small label below QR box, slate-400
  * Dynamic label above QR: "Your Business QR" OR "Invoice #AG-2024-8823" depending on context
- SCAN INSTRUCTIONS (if scanner mode):
  * Camera viewfinder (full-screen dark overlay, corner brackets in cyan, no QR shown yet)
  * "Point camera at a QR code" instruction below
- TOGGLE: "My QR" | "Scan" — pill toggle, switches between showing own QR and opening scanner

ACTION BUTTONS (below QR):
- "Share QR" (ShareNetwork, full-width cyan gradient)
- "Download" (DownloadSimple, outlined cyan)
- "Copy Link" (CopySimple, ghost)

MICRO-INTERACTIONS:
- QR appears with scale-in + fade animation
- Download: brief success flash
- Scan success: full-screen green overlay flash + vibration hint
```

---

### SCREEN 56 — Refund · `/refund`

```
Design an enterprise-grade mobile refund request screen for "Agorich Pharma". Mobile 390×844px, dark theme.

TOP NAV:
- Back arrow, "Request Refund" DM Serif Display 18px white

ORDER REFERENCE CARD (auto-loaded or searchable):
- bg-slate-800/80, rounded-2xl, border border-white/5
- Invoice # (monospace cyan) + date + amount
- "Order is eligible for refund" emerald chip OR "Refund window expired" red chip

REFUND FORM:
- "Reason for Refund" label + dropdown (select-bottom-sheet):
  Options: Wrong items delivered / Damaged goods / Quality issues / Order not delivered / Other
- "Describe the issue" textarea (bg-slate-800, 120px height, rounded-xl, placeholder text)
- "Refund Amount Requested" — pre-filled with order amount, editable for partial refund
  * Amount input: ₹ prefix chip, number input
  * "Full refund" checkbox: auto-fills max amount
- Photo Evidence section: "Upload photos (optional)" — 3 upload placeholders (80px square each, dashed cyan border, CameraPlus icon inside, tap to open camera/gallery)

SUBMIT BUTTON:
- "Submit Refund Request" full-width amber gradient 56px button
- "Estimated processing: 3–5 business days" slate-400 11px below button

MICRO-INTERACTIONS:
- Photo upload: placeholder fills with thumbnail + trash icon overlay
- Submit: loading → success screen (CheckCircle emerald animate-draw, "Refund request submitted! Ref: RF-20248821")
```

---

### SCREEN 57 — Delivery Confirmation · `/delivery/[id]/confirm`

```
Design an enterprise-grade mobile delivery confirmation screen for "Agorich Pharma". Mobile 390×844px, dark theme. This is used by logistics agents OR retailers to confirm receipt.

TOP NAV:
- Back arrow, "Confirm Delivery" DM Serif Display 18px white

DELIVERY SUMMARY CARD (read-only):
- bg-slate-800/80, rounded-2xl, padding 20px
- Invoice # (cyan monospace) + Retailer name (white semibold 18px)
- "Delivered to:" address block (MapPin icon slate-400)
- Items summary: "8 items · ₹14,820 total value"
- Delivery agent name (if available)

CONFIRMATION METHODS (tabs):
Tab 1 — "OTP Verification":
- "Enter OTP sent to retailer's phone" slate-400 14px centered
- 4/6 digit OTP input: large boxes (52px × 52px each), JetBrains Mono 28px, bg-slate-700 border border-slate-500, focus border cyan glow
- Auto-advance between boxes
- "Resend OTP" timer link (cyan, disabled with 30s countdown)

Tab 2 — "Signature":
- Full-width canvas area (300px height, bg-slate-700 rounded-2xl): draw signature with finger
- "Clear" text button top-right of canvas
- "Signature Guide" dashed line at center height of canvas

Tab 3 — "Photo Proof":
- Camera capture area: if photo taken shows thumbnail, else shows camera icon + "Tap to capture" 
- "Retake" link below thumbnail

CONFIRM BUTTON:
- "Confirm Delivery ✓" full-width emerald gradient 56px
- Disabled until at least one method completed

SUCCESS SCREEN (full-page replace):
- Animated CheckCircle (draws path animation, emerald, 80px)
- "Delivery Confirmed!" DM Serif Display 24px white
- "Invoice #AG-2024-8823 marked as delivered"
- Timestamp + confetti particles brief animation
- "Back to Deliveries" button
```

---

## 🎨 GLOBAL DESIGN TOKENS REFERENCE

```
Use these consistently across ALL 57 screens:

COLORS:
  --bg-base:        #0A0F1E   (deepest background)
  --bg-surface:     #1E293B   (card/surface)
  --bg-elevated:    #334155   (elevated elements)
  --text-primary:   #FFFFFF
  --text-secondary: #94A3B8   (slate-400)
  --text-muted:     #64748B   (slate-500)
  --accent-cyan:    #06B6D4   (distributor / admin)
  --accent-emerald: #10B981   (retailer / success)
  --accent-amber:   #F59E0B   (logistic / warning)
  --accent-violet:  #8B5CF6   (sales)
  --accent-red:     #EF4444   (danger / critical)
  --accent-indigo:  #6366F1   (secondary actions)

ROLE → ACCENT COLOR:
  SUPER_ADMIN:  cyan-500
  ADMIN:        cyan-500
  DISTRIBUTOR:  cyan-500 + indigo accents
  RETAILER:     emerald-500
  LOGISTIC:     amber-500
  SALES:        violet-500

TYPOGRAPHY:
  Display:  DM Serif Display (headings, hero numbers, invoice amounts)
  Body:     DM Sans (all body text, labels, descriptions)
  Mono:     JetBrains Mono (invoice #, batch #, codes, coordinates)

SPACING (8px grid):
  xs: 4px  sm: 8px  md: 16px  lg: 24px  xl: 32px  2xl: 48px

BORDER RADIUS:
  sm: 8px (chips, small buttons)
  md: 12px (inputs, small cards)
  lg: 16px (standard cards, rounded-2xl = 16px)
  xl: 24px (hero cards, modals)
  full: 9999px (pills, badges, FAB)

SHADOWS:
  card: 0 4px 24px rgba(0,0,0,0.3)
  glow-cyan: 0 0 20px rgba(6,182,212,0.15)
  glow-emerald: 0 0 20px rgba(16,185,129,0.15)

ANIMATION TIMINGS:
  fast: 150ms   standard: 300ms   slow: 500ms
  spring: { type: "spring", stiffness: 400, damping: 30 }
  stagger children: 60ms delay each

BOTTOM TAB BAR (universal):
  Height: 80px + safe-area-inset-bottom
  BG: #0A0F1E / backdrop-blur-md
  Border: 1px solid rgba(255,255,255,0.06)
  Active icon + label: role accent color
  Active bg: role-accent/10 rounded-xl (pill 70px × 40px)
  Inactive: slate-500

SAFE AREAS:
  Top: 44px (status bar)
  Bottom: 34px (home indicator on iPhone)
  Always use env(safe-area-inset-*) in production code

INPUTS (standard):
  Height: 52px
  BG: rgba(30, 41, 59, 0.8)   (slate-800/80)
  Border: 1px solid #475569   (slate-600)
  Border-radius: 12px
  Focus: border-color role-accent, box-shadow 0 0 0 3px role-accent/20
  Left icon: 20px, role-accent color
  Floating label: DM Sans 12px, animates on focus from placeholder position
  Error state: border #EF4444, shake animation, error text slides down

BUTTONS:
  Primary: gradient role-accent → adjacent-color, height 56px, rounded-xl
  Secondary: outlined 1px border role-accent, transparent bg, height 52px
  Ghost: text-only, role-accent color
  Destructive: #EF4444 gradient or outline
  Disabled: opacity-40, no hover/press effects
  Press state: scale(0.97) with 150ms spring

CARDS:
  Default: bg-slate-800/60, border border-white/5, rounded-2xl
  Featured: bg-gradient + border border-accent/20
  Danger: border-l-4 border-red-500 + bg-red-900/10
  Success: border-l-4 border-emerald-500 + bg-emerald-900/10

STATUS CHIPS:
  DRAFT:       bg-slate-600/20  text-slate-400
  SENT:        bg-blue-500/20   text-blue-400
  PROCESSING:  bg-amber-500/20  text-amber-400
  PACKING:     bg-orange-500/20 text-orange-400
  DELIVERED:   bg-cyan-500/20   text-cyan-400
  PAID:        bg-emerald-500/20 text-emerald-400
  OVERDUE:     bg-red-500/20    text-red-400
```

---

*End of Document · 57 Screens · Agorich Pharma Enterprise Mobile UI Prompt Kit*
*Generated for Next.js + Tailwind CSS + shadcn/ui + Framer Motion stack*
