# Spendful - Daily Spend Awareness App

## Overview

Spendful is a calm, minimal daily spend awareness mobile application built with Expo (React Native). It's deliberately NOT a budgeting app - instead, it focuses on mindful awareness through a single daily question: "Did you spend money today?"

The app follows an ethical, non-manipulative design philosophy with a calm, non-judgmental tone throughout. It's designed to be offline-first with local SQLite storage, no authentication required, and minimal external dependencies.

**Key Features:**
- Multiple spend entries per day with detailed tracking
- Weekly and monthly spend awareness summaries
- Optional daily reminder notifications
- Multi-currency support (12 currencies: USD, EUR, GBP, JPY, CNY, KRW, INR, VND, BRL, CAD, AUD, MXN)
- Custom category management (add/remove personal categories)
- Recurring entries (weekly/biweekly/monthly auto-generation)
- Data export (CSV for spreadsheets, JSON for full backup) via share sheet
- Freemium model with 30-day free history access
- Premium plans: $0.99/month, $8.99/year, or $14.99 lifetime
- Cross-platform support (iOS, Android, Web)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81
- **Language**: TypeScript with strict mode
- **Navigation**: Stack-only navigation using React Navigation Native Stack (no tabs or drawer)
- **State Management**: TanStack React Query for async data, React useState for local state
- **Animations**: React Native Reanimated for smooth, spring-based animations
- **Styling**: React Native StyleSheet with a centralized theme system (Colors, Spacing, Typography)

### Navigation Flow
Linear stack navigation from onboarding to daily prompt:
1. Onboarding (4-screen intro sequence)
2. Daily Prompt (main/home screen)
3. Weekly Summary (accessible from Daily Prompt)
4. Monthly Overview (accessible from Daily Prompt)
5. Paywall (modal for premium features)
6. Settings (app configuration)
7. RecurringSpending (list of recurring items, accessible from Settings)
8. RecurringSpendingForm (add/edit recurring items)

### Theme System
- **ThemeContext**: Manages theme mode (light/dark/system) with OS theme listening
- **Theme Modes**: Light, Dark, System (follows OS preference dynamically)
- **Colors**: Defined in constants/theme.ts with light and dark variants
- **Usage**: All screens use `useTheme()` hook for theming consistency

### Data Storage
- **Local Storage**: AsyncStorage for offline-first data persistence (cross-platform: web, iOS, Android)
- **Data Models**:
  - `spend_entries`: Stores individual spending entries (entry_id, date, amount, category, currency, note, timestamp) - supports multiple entries per day
  - `app_settings`: Configuration (reminder time, notifications, free history days, default_currency, onboarding status)
  - `subscriptions`: Subscription status tracking
  - `custom_categories`: User-defined custom categories (id, name, created_at)
  - `recurring_entries`: Recurring spend templates (id, amount, category, currency, frequency, start_date, end_date, last_generated_date, is_active)
- **Data Migration**: Automatic v1→v2 migration converts legacy daily_logs to new spend_entries format on first load
- **Recurring Entry Generation**: On app load, recurring entries are automatically generated for today based on frequency (weekly/biweekly/monthly)
- **Note**: Changed from expo-sqlite to AsyncStorage because expo-sqlite doesn't bundle on web platform. AsyncStorage works on all platforms and is sufficient for this app's simple data model.

### Backend Architecture
- **Server**: Express.js server for web deployment and API endpoints
- **Database (Server)**: PostgreSQL with Drizzle ORM for server-side data (configured but minimal usage since app is offline-first)
- **Purpose**: Primarily serves the landing page and handles web deployment; the mobile app operates independently with local SQLite

### Path Aliases
- `@/` → `./client/`
- `@shared/` → `./shared/`

### Component Architecture
- Reusable themed components: `ThemedView`, `ThemedText`, `Button`, `Card`
- Error boundary with fallback UI
- Keyboard-aware scroll view with cross-platform compatibility
- Custom hooks for theme, screen options, and color scheme

## External Dependencies

### Core Mobile Dependencies
- **@react-native-async-storage/async-storage**: Local storage for offline-first data persistence (cross-platform)
- **expo-notifications**: Daily reminder notifications
- **expo-sharing**: Native share sheet for data export
- **expo-file-system**: File operations for export functionality
- **@react-navigation/native-stack**: Stack-based navigation
- **react-native-reanimated**: Animation library
- **react-native-gesture-handler**: Touch gesture handling
- **@tanstack/react-query**: Data fetching and caching

### Server Dependencies
- **express**: Web server framework
- **pg**: PostgreSQL client for server-side database
- **drizzle-orm**: TypeScript ORM for database operations
- **http-proxy-middleware**: Development proxy for Expo bundler

### In-App Purchases
- **Status**: Simulated/mocked for development; requires native build for production
- **PaywallScreen**: Contains mock subscription logic with IAP integration notes
- **Production Setup Required**:
  1. Install `expo-in-app-purchases` (requires development build, not Expo Go)
  2. Configure products in App Store Connect and Google Play Console:
     - Monthly: `com.spendful.app.premium.monthly` ($0.99/month)
     - Yearly: `com.spendful.app.premium.yearly` ($8.99/year)
     - Lifetime: `com.spendful.app.premium.lifetime` ($14.99 one-time)
  3. Replace mock handlers in PaywallScreen with actual IAP purchase/restore flows
  4. Add server-side receipt validation for security
- **Features**: Restore Purchases button included (Apple requirement)

### Build & Development
- **expo**: Core Expo SDK and tooling
- **expo-dev-client**: Development builds for native iOS/Android
- **tsx**: TypeScript execution for server
- **drizzle-kit**: Database migration tooling

## Native Build Setup

Spendful uses **Expo Development Builds** instead of Expo Go for production-ready native iOS and Android apps.

### Directory Structure
- `ios/` - Native iOS Xcode project (generated by prebuild)
- `android/` - Native Android Gradle project (generated by prebuild)
- `eas.json` - EAS Build configuration for development, preview, and production builds

### Building the App

**Development Build (for local testing):**
```bash
# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android
```

**EAS Cloud Builds:**
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Development build (internal distribution)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (internal testing)
eas build --profile preview --platform all

# Production build (store distribution)
eas build --profile production --platform all

# Submit latest iOS build to App Store Connect using EAS Submit
eas submit -p ios
```

### Regenerating Native Folders

If you need to regenerate native folders after changing plugins or dependencies:
```bash
EXPO_NO_GIT_STATUS=1 npx expo prebuild --clean --no-install
```

### Bundle Identifiers
- iOS: `com.spendful.app`
- Android: `com.spendful.app`

**Note:** Do not change bundle identifiers after initial setup unless explicitly required.
