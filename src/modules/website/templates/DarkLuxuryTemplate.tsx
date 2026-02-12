import type { TemplateProps } from './types'

export function DarkLuxuryTemplate({ business, sections }: TemplateProps) {
  return (
    <div className="template-dark-luxury min-h-screen grain-overlay">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <div className="hero-title mb-4">
            <span className="inline-block text-xs uppercase tracking-[0.3em] text-[#d4af37] border border-[#d4af37]/30 px-4 py-2 mb-8">
              {business.tagline || business.name}
            </span>
          </div>
          <h1 className="hero-title text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <span className="gold-shimmer">{sections.hero.headline}</span>
          </h1>
          <p className="hero-subtitle text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10">
            {sections.hero.subheadline}
          </p>
          <div className="hero-cta">
            <a href={sections.hero.ctaLink} className="btn-gold inline-block px-10 py-4 text-sm uppercase tracking-wider rounded-full">
              {sections.hero.ctaText}
            </a>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 gold-line" />
      </section>

      {/* About */}
      <section className="py-28 md:py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">Über uns</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-8">{sections.about.title}</h2>
              <p className="text-lg text-white/70 leading-relaxed">{sections.about.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {sections.about.stats.map((stat, i) => (
                <div key={i} className="premium-card rounded-2xl p-8 text-center">
                  <div className="text-3xl font-bold text-[#d4af37] mb-2">{stat.value}</div>
                  <div className="text-sm text-white/50">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="gold-line max-w-6xl mx-auto" />

      {/* Services */}
      <section className="py-28 md:py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">Leistungen</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.services.title}</h2>
            <p className="text-lg text-white/50 mt-4 max-w-2xl mx-auto">{sections.services.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.services.items.map((service) => (
              <div key={service.id} className="premium-card rounded-2xl p-8">
                <h3 className="text-xl font-bold mb-3">{service.name}</h3>
                <p className="text-white/50 text-sm mb-4 leading-relaxed">{service.description}</p>
                <div className="flex items-center justify-between text-sm">
                  {service.price && <span className="text-[#d4af37] font-semibold">{service.price}</span>}
                  <span className="text-white/30">{service.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {sections.testimonials?.items && sections.testimonials.items.length > 0 && (
        <section className="py-28 md:py-36 px-6 bg-[#0a0a0a]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">Bewertungen</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.testimonials.title}</h2>
              <p className="text-lg text-white/50 mt-4 max-w-2xl mx-auto">{sections.testimonials.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.testimonials.items.map((testimonial, i) => (
                <div key={i} className="premium-card rounded-2xl p-8">
                  <div className="text-[#d4af37] text-lg mb-4">
                    {Array.from({ length: 5 }, (_, s) => (
                      <span key={s} className={s < testimonial.rating ? 'text-[#d4af37]' : 'text-white/20'}>
                        &#9733;
                      </span>
                    ))}
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed mb-6 italic">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="text-sm font-semibold text-white/90">{testimonial.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      {sections.howItWorks?.steps && sections.howItWorks.steps.length > 0 && (
        <section className="py-28 md:py-36 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">So funktioniert&apos;s</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.howItWorks.title}</h2>
              <p className="text-lg text-white/50 mt-4 max-w-2xl mx-auto">{sections.howItWorks.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sections.howItWorks.steps.map((step, i) => (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-[#d4af37]/40 flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#d4af37]">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team */}
      {sections.team.members.length > 0 && (
        <section className="py-28 md:py-36 px-6 bg-[#0a0a0a]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">Team</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.team.title}</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sections.team.members.map((member) => (
                <div key={member.id} className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[#1a1a1a] border-2 border-[#d4af37]/30 flex items-center justify-center text-2xl text-[#d4af37] font-bold overflow-hidden">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  <h3 className="text-lg font-bold">{member.name}</h3>
                  <p className="text-sm text-[#d4af37] mb-2">{member.title}</p>
                  <p className="text-sm text-white/40">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      {sections.benefits?.items && sections.benefits.items.length > 0 && (
        <section className="py-28 md:py-36 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">Vorteile</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.benefits.title}</h2>
              <p className="text-lg text-white/50 mt-4 max-w-2xl mx-auto">{sections.benefits.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.benefits.items.map((benefit, i) => (
                <div key={i} className="premium-card rounded-2xl p-8">
                  <h3 className="text-xl font-bold mb-3 text-[#d4af37]">{benefit.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {sections.faq.items.length > 0 && (
        <section className="py-28 md:py-36 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">FAQ</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.faq.title}</h2>
            </div>
            <div className="space-y-4">
              {sections.faq.items.map((faq, i) => (
                <details key={i} className="premium-card rounded-xl group">
                  <summary className="px-6 py-4 cursor-pointer text-lg font-medium list-none flex items-center justify-between">
                    {faq.question}
                    <span className="text-[#d4af37] group-open:rotate-45 transition-transform text-xl">+</span>
                  </summary>
                  <div className="px-6 pb-4 text-white/60 leading-relaxed">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="py-28 md:py-36 px-6 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">Kontakt</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-12">{sections.contact.title}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {sections.contact.phone && (
              <div className="premium-card rounded-xl p-8">
                <div className="text-sm text-white/40 uppercase tracking-wider mb-3">Telefon</div>
                <a href={`tel:${sections.contact.phone}`} className="text-lg text-[#d4af37] hover:underline">{sections.contact.phone}</a>
              </div>
            )}
            {sections.contact.email && (
              <div className="premium-card rounded-xl p-8">
                <div className="text-sm text-white/40 uppercase tracking-wider mb-3">E-Mail</div>
                <a href={`mailto:${sections.contact.email}`} className="text-lg text-[#d4af37] hover:underline break-all">{sections.contact.email}</a>
              </div>
            )}
            {sections.contact.address && (
              <div className="premium-card rounded-xl p-8">
                <div className="text-sm text-white/40 uppercase tracking-wider mb-3">Adresse</div>
                <p className="text-lg text-white/70">{sections.contact.address}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="py-28 md:py-36 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/10 via-transparent to-[#d4af37]/10" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 gold-shimmer">{sections.bookingCta.headline}</h2>
          <p className="text-lg text-white/60 mb-10">{sections.bookingCta.description}</p>
          <a href={sections.bookingCta.ctaLink} className="btn-gold inline-block px-12 py-4 text-sm uppercase tracking-wider rounded-full gold-glow">
            {sections.bookingCta.ctaText}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#2a2a2a]">
        <div className="max-w-6xl mx-auto text-center text-sm text-white/30">
          <p className="mb-2">{sections.footer.copyrightText}</p>
          {sections.footer.legalName && (
            <p>{sections.footer.legalName}{sections.footer.legalForm ? ` (${sections.footer.legalForm})` : ''}</p>
          )}
          {sections.footer.registrationNumber && sections.footer.registrationCourt && (
            <p className="mt-1">{sections.footer.registrationCourt} · {sections.footer.registrationNumber}</p>
          )}
        </div>
      </footer>
    </div>
  )
}
