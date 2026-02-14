import Link from 'next/link'
import { Calendar } from 'lucide-react'

export const metadata = {
  title: 'Legal Notice – Hebelki',
  description: 'Legal Notice (Impressum) for Hebelki booking platform',
}

export default function LegalNoticePage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Legal Notice</h1>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Company Information</h2>
            <p className="text-gray-600">
              Goldman Projects &amp; Ventures<br />
              Lot 318 East Street<br />
              North Cummingsburg<br />
              Georgetown, Guyana
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact</h2>
            <p className="text-gray-600">
              Phone: +592 696 4488<br />
              Email:{' '}
              <a href="mailto:info@book.gy" className="text-primary hover:underline">info@book.gy</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Represented by</h2>
            <p className="text-gray-600">
              Fabian Goldman, Managing Director
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Dispute Resolution</h2>
            <p className="text-gray-600">
              We are not willing or obliged to participate in dispute resolution proceedings
              before a consumer arbitration board.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Liability for Content</h2>
            <p className="text-gray-600">
              The contents of our pages were created with the utmost care. However, we cannot
              guarantee the accuracy, completeness, or timeliness of the content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Liability for Links</h2>
            <p className="text-gray-600">
              Our website contains links to external websites of third parties, over whose contents
              we have no influence. Therefore, we cannot assume any liability for these external contents.
              The respective provider or operator of the linked pages is always responsible for their content.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
