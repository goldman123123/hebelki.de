import Link from 'next/link'
import { Calendar } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy – Hebelki',
  description: 'Privacy Policy for Hebelki booking platform',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Hebelki</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 2026</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Introduction</h2>
            <p className="text-gray-600">
              Hebelki (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the booking platform available at book.gy and hebelki.de.
              This Privacy Policy explains how we collect, use, disclose, and protect your personal data
              when you use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Data We Collect</h2>
            <p className="text-gray-600 mb-2">We collect the following categories of personal data:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li><strong>Account data:</strong> Name, email address when you create an account</li>
              <li><strong>Booking data:</strong> Name, email, phone number, appointment details when you make a booking</li>
              <li><strong>Communication data:</strong> Messages sent through our chatbot or live chat</li>
              <li><strong>Usage data:</strong> IP address, browser type, pages visited, collected automatically</li>
              <li><strong>Cookies:</strong> Essential cookies for functionality and locale preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. How We Use Your Data</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>To provide and maintain our booking services</li>
              <li>To send booking confirmations and reminders</li>
              <li>To respond to your inquiries via chatbot or live chat</li>
              <li>To improve our services and user experience</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Legal Basis (GDPR)</h2>
            <p className="text-gray-600">We process your data based on:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li><strong>Contract performance:</strong> Processing necessary to fulfill bookings (Art. 6(1)(b) GDPR)</li>
              <li><strong>Legitimate interest:</strong> Service improvement and fraud prevention (Art. 6(1)(f) GDPR)</li>
              <li><strong>Consent:</strong> Marketing communications, where applicable (Art. 6(1)(a) GDPR)</li>
              <li><strong>Legal obligation:</strong> Tax and accounting requirements (Art. 6(1)(c) GDPR)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Data Sharing</h2>
            <p className="text-gray-600">
              We share your data only with service providers necessary for our operations:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li><strong>Clerk:</strong> Authentication services (US, EU Standard Contractual Clauses)</li>
              <li><strong>Neon:</strong> Database hosting (EU)</li>
              <li><strong>Vercel:</strong> Application hosting (EU/US)</li>
              <li><strong>OpenAI / OpenRouter:</strong> AI chatbot processing</li>
              <li><strong>Stripe:</strong> Payment processing (where applicable)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Your Rights</h2>
            <p className="text-gray-600 mb-2">Under GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Restrict or object to processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-gray-600 mt-2">
              To exercise these rights, contact us at{' '}
              <a href="mailto:info@book.gy" className="text-primary hover:underline">info@book.gy</a>{' '}
              or use our{' '}
              <Link href="/gdpr/request" className="text-primary hover:underline">data deletion request form</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Data Retention</h2>
            <p className="text-gray-600">
              We retain your data only as long as necessary for the purposes described above,
              or as required by law. Booking data is retained according to each business&apos;s
              data retention policy. You can request deletion at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Cookies</h2>
            <p className="text-gray-600">
              We use essential cookies for authentication and locale detection. We do not use
              tracking cookies or third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Contact</h2>
            <p className="text-gray-600">
              For privacy-related inquiries, please contact:<br />
              Email:{' '}
              <a href="mailto:info@book.gy" className="text-primary hover:underline">info@book.gy</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
