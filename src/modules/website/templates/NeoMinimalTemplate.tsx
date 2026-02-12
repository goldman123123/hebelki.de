import type { TemplateProps } from './types'

export function NeoMinimalTemplate({ business, sections }: TemplateProps) {
  return (
    <div className="template-neo-minimal min-h-screen">
      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs uppercase tracking-[0.4em] text-black/40 mb-8 block">{business.tagline || business.name}</span>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-light tracking-tight leading-[0.9] mb-12">
            {sections.hero.headline}
          </h1>
          <div className="w-24 h-px bg-black/20 mx-auto mb-12" />
          <p className="text-xl text-black/50 max-w-lg mx-auto leading-relaxed mb-12">{sections.hero.subheadline}</p>
          <a href={sections.hero.ctaLink} className="border border-black text-black px-12 py-4 text-sm uppercase tracking-wider hover:bg-black hover:text-white transition-colors duration-500 inline-block">
            {sections.hero.ctaText}
          </a>
        </div>
      </section>

      {/* About */}
      <section className="py-28 md:py-36 px-6 bg-[#fafafa]">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs uppercase tracking-[0.4em] text-black/40 mb-8 block">Über uns</span>
          <h2 className="text-4xl md:text-5xl font-light mb-12">{sections.about.title}</h2>
          <p className="text-lg text-black/60 leading-relaxed mb-16">{sections.about.description}</p>
          {sections.about.stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black/10">
              {sections.about.stats.map((stat, i) => (
                <div key={i} className="bg-[#fafafa] p-8 text-center">
                  <div className="text-3xl font-light text-black mb-2">{stat.value}</div>
                  <div className="text-xs uppercase tracking-[0.3em] text-black/40">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Services */}
      <section className="py-28 md:py-36 px-6">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs uppercase tracking-[0.4em] text-black/40 mb-8 block">Leistungen</span>
          <h2 className="text-4xl md:text-5xl font-light mb-16">{sections.services.title}</h2>
          <div className="space-y-0">
            {sections.services.items.map((service) => (
              <div key={service.id} className="flex flex-col md:flex-row md:items-center justify-between py-8 border-b border-black/10 group">
                <div className="flex-1">
                  <h3 className="text-2xl font-light group-hover:text-black/70 transition-colors">{service.name}</h3>
                  <p className="text-sm text-black/40 mt-2 max-w-md">{service.description}</p>
                </div>
                <div className="mt-4 md:mt-0 md:text-right shrink-0 md:ml-8">
                  {service.price && <div className="text-xl font-light">{service.price}</div>}
                  <div className="text-xs uppercase tracking-wider text-black/30">{service.duration}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {sections.testimonials?.items && sections.testimonials.items.length > 0 && (
        <section className="py-28 md:py-36 px-6 bg-[#fafafa]">
          <div className="max-w-4xl mx-auto">
            <span className="text-xs uppercase tracking-[0.4em] text-black/40 mb-8 block">{sections.testimonials.subtitle}</span>
            <h2 className="text-4xl md:text-5xl font-light mb-16">{sections.testimonials.title}</h2>
            <div className="space-y-0">
              {sections.testimonials.items.map((testimonial, i) => (
                <div key={i} className="py-10 border-b border-black/10">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <span key={s} className={s < testimonial.rating ? 'text-black' : 'text-black/10'}>&#9733;</span>
                    ))}
                  </div>
                  <p className="text-lg text-black/60 leading-relaxed font-light mb-6 italic">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="text-sm uppercase tracking-[0.3em] text-black/40">{testimonial.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      {sections.howItWorks?.steps && sections.howItWorks.steps.length > 0 && (
        <section className="py-28 md:py-36 px-6">
          <div className="max-w-4xl mx-auto">
            <span className="text-xs uppercase tracking-[0.4em] text-black/40 mb-8 block">{sections.howItWorks.subtitle}</span>
            <h2 className="text-4xl md:text-5xl font-light mb-16">{sections.howItWorks.title}</h2>
            <div className="space-y-0">
              {sections.howItWorks.steps.map((step, i) => (
                <div key={i} className="flex gap-10 py-10 border-b border-black/10">
                  <div className="shrink-0">
                    <span className="text-5xl font-light text-black/10">{step.step}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-light mb-3">{step.title}</h3>
                    <p className="text-black/40 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team */}
      {sections.team.members.length > 0 && (
        <section className="py-28 md:py-36 px-6 bg-[#fafafa]">
          <div className="max-w-4xl mx-auto">
            <span className="text-xs uppercase tracking-[0.4em] text-black/40 mb-8 block">Team</span>
            <h2 className="text-4xl md:text-5xl font-light mb-16">{sections.team.title}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
              {sections.team.members.map((member) => (
                <div key={member.id} className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-black/5 flex items-center justify-center text-xl font-light text-black/40 overflow-hidden">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  <h3 className="text-lg font-light">{member.name}</h3>
                  <p className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">{member.title}</p>
                  <p className="text-sm text-black/40">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      {sections.benefits?.items && sections.benefits.items.length > 0 && (
        <section className="py-28 md:py-36 px-6">
          <div className="max-w-4xl mx-auto">
            <span className="text-xs uppercase tracking-[0.4em] text-black/40 mb-8 block">{sections.benefits.subtitle}</span>
            <h2 className="text-4xl md:text-5xl font-light mb-16">{sections.benefits.title}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-black/10">
              {sections.benefits.items.map((benefit, i) => (
                <div key={i} className="bg-white p-10">
                  <h3 className="text-xl font-light mb-4">{benefit.title}</h3>
                  <div className="w-8 h-px bg-black/20 mb-4" />
                  <p className="text-sm text-black/40 leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {sections.faq.items.length > 0 && (
        <section className="py-28 md:py-36 px-6 bg-[#fafafa]">
          <div className="max-w-3xl mx-auto">
            <span className="text-xs uppercase tracking-[0.4em] text-black/40 mb-8 block text-center">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-light mb-16 text-center">{sections.faq.title}</h2>
            <div className="space-y-0">
              {sections.faq.items.map((faq, i) => (
                <details key={i} className="border-b border-black/10 group">
                  <summary className="py-6 cursor-pointer text-lg font-light list-none flex items-center justify-between">
                    {faq.question}
                    <span className="text-black/30 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="pb-6 text-black/50 leading-relaxed">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="py-28 md:py-36 px-6 bg-black text-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-white/40 mb-8 block">Kontakt</span>
              <h2 className="text-4xl md:text-5xl font-light">{sections.contact.title}</h2>
            </div>
            <div className="space-y-6">
              {sections.contact.phone && (
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-white/40">Telefon</span>
                  <a href={`tel:${sections.contact.phone}`} className="text-xl font-light hover:text-white/70 transition-colors">{sections.contact.phone}</a>
                </div>
              )}
              {sections.contact.email && (
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-white/40">E-Mail</span>
                  <a href={`mailto:${sections.contact.email}`} className="text-xl font-light hover:text-white/70 transition-colors">{sections.contact.email}</a>
                </div>
              )}
              {sections.contact.address && (
                <div className="flex justify-between items-center">
                  <span className="text-white/40">Adresse</span>
                  <span className="text-xl font-light">{sections.contact.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="py-28 md:py-36 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-light mb-8">{sections.bookingCta.headline}</h2>
          <p className="text-black/50 mb-12">{sections.bookingCta.description}</p>
          <a href={sections.bookingCta.ctaLink} className="border border-black text-black px-12 py-4 text-sm uppercase tracking-wider hover:bg-black hover:text-white transition-colors duration-500 inline-block">
            {sections.bookingCta.ctaText}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-black/10">
        <div className="max-w-6xl mx-auto text-center text-sm text-black/30">
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
