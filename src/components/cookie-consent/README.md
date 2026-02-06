# Cookie Consent Implementation

GDPR-compliant cookie consent banner for Hebelki, built with `vanilla-cookieconsent`.

## Features

✅ **GDPR Compliant** - Full compliance with EU regulations
✅ **Multi-language** - German (primary) and English support
✅ **Granular Control** - Necessary, Analytics, and Marketing categories
✅ **Auto-clear** - Automatically removes cookies when user opts out
✅ **Revision Management** - Re-prompt users when cookie policy changes
✅ **Accessible** - WCAG 2.1 AA compliant with keyboard navigation
✅ **Responsive** - Mobile-friendly design
✅ **Customizable** - Matches Hebelki branding

---

## Installation

Already installed! The component is included in the root layout (`src/app/layout.tsx`).

---

## Cookie Categories

### 1. **Necessary Cookies** (Always Active)
Cannot be disabled. Required for core functionality.

**Current cookies:**
- `__session` - Clerk authentication
- `cc_cookie` - Cookie consent preferences

### 2. **Analytics Cookies** (Opt-in Required)
Helps understand user behavior.

**Prepared for:**
- `_ga`, `_gid` - Google Analytics (when implemented)

### 3. **Marketing Cookies** (Opt-in Required)
Used for targeted advertising.

**Not currently used** - Prepared for future implementation

---

## Usage

### Accessing User Consent Preferences

```typescript
import * as CookieConsent from 'vanilla-cookieconsent'

// Check if user has accepted analytics cookies
const userPreferences = CookieConsent.getUserPreferences()

if (userPreferences.acceptedCategories.includes('analytics')) {
  // Initialize Google Analytics
  console.log('Analytics enabled')
}

// Check specific category
const analyticsAccepted = CookieConsent.acceptedCategory('analytics')
const marketingAccepted = CookieConsent.acceptedCategory('marketing')
```

### Programmatically Show Settings

```typescript
import * as CookieConsent from 'vanilla-cookieconsent'

// Show preferences modal
CookieConsent.showPreferences()

// Show consent modal (if not already shown)
CookieConsent.show()

// Hide modal
CookieConsent.hide()
```

### Example: Initialize Google Analytics

```typescript
// src/lib/analytics.ts
import * as CookieConsent from 'vanilla-cookieconsent'

export function initializeAnalytics() {
  if (CookieConsent.acceptedCategory('analytics')) {
    // Initialize Google Analytics
    window.gtag('config', 'GA-MEASUREMENT-ID')
  }
}

// Call when consent changes
CookieConsent.on('onChange', ({ changedCategories }) => {
  if (changedCategories.includes('analytics')) {
    initializeAnalytics()
  }
})
```

---

## Customization

### Change Revision Number

When you update the cookie policy, increment the revision number to re-prompt users:

```typescript
// src/components/cookie-consent/CookieConsent.tsx
CookieConsent.run({
  revision: 2, // Increment this number
  // ...
})
```

### Add New Cookie Categories

```typescript
categories: {
  necessary: { enabled: true, readOnly: true },
  analytics: { enabled: false },
  marketing: { enabled: false },
  // Add new category
  preferences: {
    enabled: false,
    readOnly: false,
    autoClear: {
      cookies: [{ name: 'user_preferences' }]
    }
  }
}
```

### Update Translations

Edit the `language.translations` object in `CookieConsent.tsx`:

```typescript
de: {
  consentModal: {
    title: 'Your custom title',
    description: 'Your custom description',
    // ...
  }
}
```

### Custom Styling

Edit `cookie-consent-custom.css` to change:
- Colors (update CSS variables)
- Border radius
- Button styles
- Spacing

```css
#cm {
  --cc-primary-color: #your-color;
  --cc-btn-primary-bg: #your-button-color;
}
```

---

## Testing

### Local Testing

```bash
# Start dev server
npm run dev

# Visit any page
open http://localhost:3005

# Cookie banner should appear
```

### Test Scenarios

1. **First Visit** - Banner should appear
2. **Accept All** - All cookies accepted, banner hidden
3. **Necessary Only** - Only necessary cookies accepted
4. **Manage Settings** - Open preferences modal, toggle categories
5. **Revision Change** - Increment revision number, banner re-appears

### Browser DevTools

```javascript
// Check consent in browser console
CookieConsent.getUserPreferences()

// Output:
// {
//   acceptType: 'all' | 'necessary',
//   acceptedCategories: ['necessary', 'analytics'],
//   rejectedCategories: ['marketing']
// }
```

---

## Compliance Checklist

- [x] Banner appears on first visit
- [x] User can accept all or necessary only
- [x] User can manage preferences granularly
- [x] Cookies auto-clear when user opts out
- [x] Link to privacy policy in banner
- [x] Link to legal notice (Impressum) in banner
- [x] German translations (primary language)
- [x] Accessible (keyboard navigation, ARIA labels)
- [x] Responsive (mobile-friendly)
- [x] Revision management (re-consent on policy changes)

---

## Legal Requirements

### GDPR (EU)
✅ Explicit consent required for non-essential cookies
✅ Easy opt-out mechanism
✅ Clear information about cookie usage
✅ Consent storage and revocation

### TTDSG (Germany)
✅ Prior consent before setting cookies
✅ No pre-checked boxes
✅ Equal prominence for accept/reject buttons
✅ Link to privacy policy

### ePrivacy Directive
✅ User control over cookies
✅ Clear and comprehensive information
✅ Consent mechanism in place

---

## Adding Google Analytics (Example)

When ready to add analytics:

1. **Install Google Analytics:**
```bash
npm install react-ga4
```

2. **Update Cookie Consent:**
```typescript
// src/components/cookie-consent/CookieConsent.tsx
onConsent: ({ cookie }) => {
  if (cookie.categories.includes('analytics')) {
    // Initialize GA
    ReactGA.initialize('GA-MEASUREMENT-ID')
  }
}
```

3. **Create Analytics Helper:**
```typescript
// src/lib/analytics.ts
import ReactGA from 'react-ga4'
import * as CookieConsent from 'vanilla-cookieconsent'

export function trackPageView(url: string) {
  if (CookieConsent.acceptedCategory('analytics')) {
    ReactGA.send({ hitType: 'pageview', page: url })
  }
}
```

---

## Troubleshooting

### Banner Not Appearing
- Check browser console for errors
- Clear cookies: `document.cookie = "cc_cookie=; expires=Thu, 01 Jan 1970"`
- Refresh page

### Styles Not Applied
- Ensure `cookie-consent-custom.css` is imported after `cookieconsent.css`
- Check CSS specificity (use `!important` if needed)

### Consent Not Persisting
- Check if cookies are enabled in browser
- Check cookie domain/path settings
- Verify `cc_cookie` is being set (DevTools → Application → Cookies)

### Translations Not Working
- Verify `language.default` is set correctly
- Check browser language detection
- Force language: `CookieConsent.run({ language: { default: 'de' } })`

---

## Resources

- [vanilla-cookieconsent Documentation](https://github.com/orestbida/cookieconsent)
- [GDPR Compliance Guide](https://gdpr.eu/cookies/)
- [German TTDSG Law](https://www.gesetze-im-internet.de/ttdsg/)
- [ePrivacy Directive](https://ec.europa.eu/digital-single-market/en/privacy-and-electronic-communications)

---

## Support

For questions or issues:
- Check `src/components/cookie-consent/CookieConsent.tsx` for configuration
- Review `cookie-consent-custom.css` for styling
- Consult vanilla-cookieconsent documentation
- Test in browser DevTools console

---

**Last Updated:** 2026-02-05
**Version:** 1.0.0
**License:** Part of Hebelki platform
