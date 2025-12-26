# Spendful Design Guidelines

## Core Design Philosophy
**Calm, minimal daily spend awareness app**
- Calm, non-judgmental tone throughout
- Mindfulness-style UI aesthetic
- One daily action only: "Did you spend money today?"
- Ethical, non-manipulative design
- Offline-first experience

## Navigation Architecture
**Stack-Only Navigation** (no tabs or drawer)
- Linear flow from onboarding to daily prompt
- Daily Prompt is the main/home screen
- Weekly Summary and Monthly Overview accessible from Daily Prompt
- Paywall presented modally when accessing history beyond 14 days

## Screen Specifications

### 1. Onboarding (4 Screens)
**Purpose**: Introduce app philosophy and set preferences
- Screen 1: "This is not a budget."
- Screen 2: Explain one daily question concept
- Screen 3: Explain awareness (not control)
- Screen 4: Request daily reminder time + notification permission
- **Layout**: Full-screen cards with next/skip navigation
- **Progression**: Linear stack with forward navigation only

### 2. Daily Prompt (Main Screen)
**Purpose**: Daily logging interface
- **Header**: Display "Today" with current date
- **Main Content**: 
  - Centered question: "Did you spend money today?"
  - Two equal-width buttons: "No" / "Yes"
  - If "Yes" selected: Show amount input field + optional note field
  - Confirmation message: "Thanks. See you tomorrow 🌱"
- **Layout**: Centered, vertically stacked, non-scrollable
- **Visual Hierarchy**: Question > Buttons > Input (conditional)

### 3. Weekly Summary
**Purpose**: Show 7-day awareness snapshot
- **Display Elements**:
  - Days logged count
  - Spend days vs no-spend days
  - Total spent (neutral presentation)
  - Neutral dots or simple bars (no red/green coloring)
  - No comparisons or judgment language
- **Layout**: Scrollable list of summary cards

### 4. Monthly Overview
**Purpose**: Calendar-based monthly view
- **Main Component**: Calendar grid with dots per day
  - Spend day indicator
  - No-spend day indicator
  - Not logged indicator
- **Summary Section**:
  - Days logged
  - Spend days count
  - No-spend days count
  - Total logged spend
  - Non-judgmental reflection line
- **Layout**: Calendar at top, summary cards below, scrollable

### 5. Paywall (Modal)
**Purpose**: Ethical subscription offer
- **Trigger**: Only when viewing history > 14 days
- **Copy**: 
  - "Keep your full picture."
  - "Unlock long-term awareness."
- **Pricing Display**:
  - $1.99/month
  - $9.99/year (highlighted as recommended)
  - $14.99 lifetime
- **Actions**: Subscribe buttons + "Not now" option
- **Tone**: Calm, ethical, no FOMO or pressure tactics
- **Layout**: Modal card, centered pricing options

## Visual Design System

### Color Palette
- **Primary Background**: White or warm light (#FAFAF8 or similar)
- **Text**: Soft black or dark gray (avoid pure #000000)
- **Accents**: Calm, neutral tones (avoid flashy colors)
- **Status Indicators**: 
  - Spend days: Soft neutral (NOT red)
  - No-spend days: Soft neutral (NOT green)
  - Not logged: Very light gray
- **No red/green judgment colors**

### Typography
- **System fonts only** (San Francisco for iOS, Roboto for Android)
- **Font Sizes**:
  - Question text: Large, readable
  - Button text: Medium
  - Summary text: Small to medium
  - Note: Hierarchy should support calm, unrushed reading

### Spacing
- **Soft, generous spacing** throughout
- Breathing room between elements
- Not cramped or dense

### Components

#### Buttons
- Equal-width "No" / "Yes" buttons on Daily Prompt
- Clear, tappable areas
- Subtle visual feedback (no aggressive animations)
- Rounded corners for calmness

#### Input Fields
- Amount input: Number pad, currency symbol
- Note field: Optional, expandable text area
- Minimal borders, soft focus states

#### Calendar Dots
- Simple circular indicators
- Consistent size
- Clear but not loud

#### Summary Cards
- Clean, card-based layout
- Soft shadows (if any)
- Generous padding

### Interaction Design
- **No gamification**: No streaks, no badges, no points
- **No charts with axes**: Only simple dots/bars for visualization
- **Confirmation messages**: Brief, warm, non-judgmental
- **Editing**: Allow editing current day's log (not prominent)
- **Missed days**: Show as not logged, no pressure or autofill

## Accessibility Requirements
- Sufficient color contrast for text
- Tappable areas minimum 44x44 points
- Support system font sizing
- VoiceOver/TalkBack compatible labels
- Keyboard navigation support where applicable

## Notifications
- **Copy**: "Did you spend money today?"
- **Time**: User-selected during onboarding
- **Tone**: Gentle reminder, no urgency
- **Frequency**: Once daily only
- **Optional**: Can be disabled in settings

## What NOT to Include
❌ Categories or tags  
❌ Budget limits or goals  
❌ Analytics dashboards  
❌ Social features or sharing  
❌ Bank integrations  
❌ Authentication/login  
❌ Advertisements  
❌ Red/green judgment colors  
❌ Streak counters or pressure mechanics  
❌ Comparison charts or graphs with axes  

## Assets Required
- None (use system icons only)
- Optional: Simple plant emoji 🌱 for confirmation message