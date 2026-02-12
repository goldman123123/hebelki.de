import type { TemplateProps } from './types'

export function BrutalismTemplate({ business, sections }: TemplateProps) {
  return (
    <div className="template-brutalism min-h-screen">
      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center px-6 relative">
        <div className="max-w-6xl mx-auto text-center">
          <div className="brutal-border inline-block bg-[#d4af37] px-6 py-2 mb-8">
            <span className="text-sm font-bold uppercase tracking-widest">{business.tagline || 'Willkommen'}</span>
          </div>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase leading-[0.9] mb-8">
            <span className="text-stroke-black block">{sections.hero.headline}</span>
          </h1>
          <p className="font-mono text-lg text-black/60 max-w-xl mx-auto mb-10">{sections.hero.subheadline}</p>
          <a href={sections.hero.ctaLink} className="brutal-border inline-block bg-black text-white px-10 py-4 text-sm font-bold uppercase tracking-wider hover:bg-[#d4af37] hover:text-black transition-colors">
            {sections.hero.ctaText}
          </a>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rotate-[8deg]">
          <div className="brutal-border bg-white px-4 py-2 text-sm font-mono">&darr; Scroll</div>
        </div>
      </section>

      {/* About */}
      <section className="py-28 px-6 bg-black text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="brutal-border-thin border-white inline-block px-4 py-1 mb-8">
                <span className="text-xs uppercase tracking-widest">Über uns</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black uppercase mb-8">{sections.about.title}</h2>
              <p className="text-lg text-white/70 leading-relaxed">{sections.about.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {sections.about.stats.map((stat, i) => (
                <div key={i} className="bg-white text-black brutal-border border-white p-6 text-center" style={{ transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)` }}>
                  <div className="text-4xl font-black mb-1">{stat.value}</div>
                  <div className="text-xs uppercase tracking-wider font-mono">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 className="text-5xl md:text-7xl font-black uppercase">{sections.services.title}</h2>
            <p className="font-mono text-black/50 mt-4">{sections.services.subtitle}</p>
          </div>
          <div className="space-y-4">
            {sections.services.items.map((service, i) => (
              <div key={service.id} className="brutal-border bg-white p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4" style={{ transform: `rotate(${i % 2 === 0 ? -0.5 : 0.5}deg)` }}>
                <div className="bg-black text-white w-12 h-12 flex items-center justify-center text-xl font-black shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black uppercase">{service.name}</h3>
                  <p className="font-mono text-sm text-black/50 mt-1">{service.description}</p>
                </div>
                <div className="text-right shrink-0">
                  {service.price && <div className="text-2xl font-black">{service.price}</div>}
                  <div className="font-mono text-xs text-black/40">{service.duration}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {sections.testimonials?.items && sections.testimonials.items.length > 0 && (
        <section className="py-28 px-6 bg-black text-white">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16">
              <h2 className="text-5xl md:text-7xl font-black uppercase">{sections.testimonials.title}</h2>
              <p className="font-mono text-white/50 mt-4">{sections.testimonials.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.testimonials.items.map((testimonial, i) => (
                <div key={i} className="brutal-border border-white bg-white text-black p-6" style={{ transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)` }}>
                  <div className="text-[#d4af37] text-lg mb-3">
                    {Array.from({ length: 5 }, (_, s) => (
                      <span key={s} className={s < testimonial.rating ? 'text-[#d4af37]' : 'text-black/20'}>
                        &#9733;
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-black/70 leading-relaxed mb-4">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="text-sm font-black uppercase">{testimonial.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      {sections.howItWorks?.steps && sections.howItWorks.steps.length > 0 && (
        <section className="py-28 px-6 bg-[#d4af37]">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16">
              <h2 className="text-5xl md:text-7xl font-black uppercase">{sections.howItWorks.title}</h2>
              <p className="font-mono text-black/50 mt-4">{sections.howItWorks.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.howItWorks.steps.map((step, i) => (
                <div key={i} className="brutal-border bg-white p-6" style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)` }}>
                  <div className="bg-black text-white w-14 h-14 flex items-center justify-center text-2xl font-black mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-black uppercase mb-2">{step.title}</h3>
                  <p className="font-mono text-sm text-black/50">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team */}
      {sections.team.members.length > 0 && (
        <section className="py-28 px-6 bg-[#d4af37]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-black uppercase mb-16">{sections.team.title}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.team.members.map((member, i) => (
                <div key={member.id} className="brutal-border bg-white p-6" style={{ transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)` }}>
                  <div className="w-16 h-16 bg-black text-white text-2xl font-black flex items-center justify-center mb-4 overflow-hidden">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  <h3 className="text-xl font-black uppercase">{member.name}</h3>
                  <p className="font-mono text-xs uppercase tracking-wider text-black/50 mb-2">{member.title}</p>
                  <p className="text-sm text-black/60">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      {sections.benefits?.items && sections.benefits.items.length > 0 && (
        <section className="py-28 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16">
              <h2 className="text-5xl md:text-7xl font-black uppercase">{sections.benefits.title}</h2>
              <p className="font-mono text-black/50 mt-4">{sections.benefits.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.benefits.items.map((benefit, i) => (
                <div key={i} className="brutal-border bg-white p-6 md:p-8" style={{ transform: `rotate(${i % 2 === 0 ? -0.5 : 0.5}deg)` }}>
                  <h3 className="text-xl font-black uppercase mb-2">{benefit.title}</h3>
                  <p className="font-mono text-sm text-black/50">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {sections.faq.items.length > 0 && (
        <section className="py-28 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-black uppercase mb-16">{sections.faq.title}</h2>
            <div className="space-y-4">
              {sections.faq.items.map((faq, i) => (
                <details key={i} className="brutal-border bg-white group">
                  <summary className="px-6 py-4 cursor-pointer font-bold uppercase text-lg list-none flex items-center justify-between">
                    {faq.question}
                    <span className="bg-black text-white w-8 h-8 flex items-center justify-center font-mono group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="px-6 pb-4 font-mono text-sm text-black/60 border-t-2 border-black pt-4">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="py-28 px-6 bg-black text-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-black uppercase mb-12">{sections.contact.title}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {sections.contact.phone && (
              <div className="brutal-border border-white bg-white text-black p-6">
                <div className="font-mono text-xs uppercase tracking-wider mb-3">Telefon</div>
                <a href={`tel:${sections.contact.phone}`} className="text-lg font-bold hover:text-[#d4af37]">{sections.contact.phone}</a>
              </div>
            )}
            {sections.contact.email && (
              <div className="brutal-border border-white bg-white text-black p-6">
                <div className="font-mono text-xs uppercase tracking-wider mb-3">E-Mail</div>
                <a href={`mailto:${sections.contact.email}`} className="text-lg font-bold hover:text-[#d4af37] break-all">{sections.contact.email}</a>
              </div>
            )}
            {sections.contact.address && (
              <div className="brutal-border border-white bg-white text-black p-6">
                <div className="font-mono text-xs uppercase tracking-wider mb-3">Adresse</div>
                <p className="text-lg font-bold">{sections.contact.address}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="py-28 px-6 bg-[#ff6600] text-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-black uppercase mb-6">{sections.bookingCta.headline}</h2>
          <p className="font-mono text-lg text-black/60 mb-10">{sections.bookingCta.description}</p>
          <a href={sections.bookingCta.ctaLink} className="brutal-border inline-block bg-black text-white px-12 py-4 text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors">
            {sections.bookingCta.ctaText}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t-4 border-black">
        <div className="max-w-6xl mx-auto text-center font-mono text-sm text-black/50">
          <p className="mb-1">{sections.footer.copyrightText}</p>
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
