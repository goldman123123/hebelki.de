import type { TemplateProps } from './types'

export function EditorialTemplate({ business, sections }: TemplateProps) {
  return (
    <div className="template-editorial min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-end overflow-hidden px-6 pb-20">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-[#1a1a1a]" />
        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <span className="inline-block text-[#d4af37] text-sm uppercase tracking-[0.3em] border-b border-[#d4af37] pb-2 mb-8">
            {business.tagline || business.name}
          </span>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold leading-[0.85] tracking-tight mb-6">
            {sections.hero.headline}
          </h1>
          <p className="text-xl md:text-2xl text-white/60 max-w-2xl leading-relaxed mb-10">{sections.hero.subheadline}</p>
          <a href={sections.hero.ctaLink} className="inline-flex items-center gap-3 bg-[#d4af37] text-black px-8 py-4 rounded-full font-semibold hover:bg-[#e8c252] transition-colors">
            {sections.hero.ctaText}
          </a>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
      </section>

      {/* About - Editorial Layout */}
      <section className="py-28 md:py-36 bg-black px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-16">
            <div className="lg:col-span-3">
              <span className="text-[200px] leading-none text-outline opacity-30 block">01</span>
            </div>
            <div className="lg:col-span-9">
              <h2 className="text-4xl md:text-5xl font-bold mb-12">{sections.about.title}</h2>
              <p className="text-xl text-white/60 leading-relaxed drop-cap mb-8">{sections.about.description}</p>
              {sections.about.stats.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
                  {sections.about.stats.map((stat, i) => (
                    <div key={i} className="border-l-4 border-[#d4af37] pl-6">
                      <div className="text-4xl font-bold text-[#d4af37]">{stat.value}</div>
                      <div className="text-white/40 mt-2">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-28 md:py-36 bg-[#0a0a0a] px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <span className="text-[#d4af37] text-sm uppercase tracking-[0.3em]">Leistungen</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.services.title}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10">
            {sections.services.items.map((service) => (
              <div key={service.id} className="bg-[#0a0a0a] p-12 group hover:bg-[#111] transition-colors">
                <h3 className="text-2xl font-bold mb-4 group-hover:text-[#d4af37] transition-colors">{service.name}</h3>
                <p className="text-white/40 leading-relaxed mb-4">{service.description}</p>
                <div className="flex items-center justify-between text-sm pt-4 border-t border-white/10">
                  {service.price && <span className="text-[#d4af37] font-semibold">{service.price}</span>}
                  <span className="text-white/20">{service.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {sections.testimonials?.items && sections.testimonials.items.length > 0 && (
        <section className="py-28 md:py-36 bg-black px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16">
              <span className="text-[#d4af37] text-sm uppercase tracking-[0.3em]">{sections.testimonials.subtitle}</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.testimonials.title}</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10">
              {sections.testimonials.items.map((testimonial, i) => (
                <div key={i} className="bg-black p-12 group hover:bg-[#0a0a0a] transition-colors">
                  <div className="flex gap-1 mb-6">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <span key={s} className={s < testimonial.rating ? 'text-[#d4af37]' : 'text-white/10'}>&#9733;</span>
                    ))}
                  </div>
                  <p className="text-white/60 leading-relaxed mb-8 italic">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="border-l-4 border-[#d4af37] pl-4">
                    <div className="font-bold text-white">{testimonial.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      {sections.howItWorks?.steps && sections.howItWorks.steps.length > 0 && (
        <section className="py-28 md:py-36 bg-[#0a0a0a] px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-12 gap-16">
              <div className="lg:col-span-3">
                <span className="text-[120px] leading-none text-outline opacity-20 block">02</span>
              </div>
              <div className="lg:col-span-9">
                <span className="text-[#d4af37] text-sm uppercase tracking-[0.3em]">{sections.howItWorks.subtitle}</span>
                <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-16">{sections.howItWorks.title}</h2>
                <div className="space-y-12">
                  {sections.howItWorks.steps.map((step, i) => (
                    <div key={i} className="grid lg:grid-cols-12 gap-8 items-start">
                      <div className="lg:col-span-2">
                        <span className="text-[80px] leading-none text-outline opacity-20 block">{step.step}</span>
                      </div>
                      <div className="lg:col-span-10 border-l-4 border-[#d4af37] pl-8">
                        <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                        <p className="text-white/40 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Team */}
      {sections.team.members.length > 0 && (
        <section className="py-28 md:py-36 bg-black px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-12 gap-16">
              <div className="lg:col-span-3">
                <span className="text-[120px] leading-none text-outline opacity-20 block">03</span>
              </div>
              <div className="lg:col-span-9">
                <span className="text-[#d4af37] text-sm uppercase tracking-[0.3em]">Team</span>
                <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-12">{sections.team.title}</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  {sections.team.members.map((member) => (
                    <div key={member.id} className="flex gap-6 items-start">
                      <div className="w-16 h-16 shrink-0 rounded-full bg-[#1a1a1a] border border-[#d4af37]/30 flex items-center justify-center text-xl font-bold text-[#d4af37] overflow-hidden">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          member.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{member.name}</h3>
                        <p className="text-sm text-[#d4af37] mb-2">{member.title}</p>
                        <p className="text-sm text-white/40">{member.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      {sections.benefits?.items && sections.benefits.items.length > 0 && (
        <section className="py-28 md:py-36 bg-[#0a0a0a] px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16">
              <span className="text-[#d4af37] text-sm uppercase tracking-[0.3em]">{sections.benefits.subtitle}</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.benefits.title}</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10">
              {sections.benefits.items.map((benefit, i) => (
                <div key={i} className="bg-[#0a0a0a] p-12 group hover:bg-[#111] transition-colors">
                  <div className="border-l-4 border-[#d4af37] pl-6 mb-6">
                    <h3 className="text-2xl font-bold group-hover:text-[#d4af37] transition-colors">{benefit.title}</h3>
                  </div>
                  <p className="text-white/40 leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {sections.faq.items.length > 0 && (
        <section className="py-28 md:py-36 bg-black px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-[#d4af37] text-sm uppercase tracking-[0.3em]">FAQ</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.faq.title}</h2>
            </div>
            <div className="space-y-0">
              {sections.faq.items.map((faq, i) => (
                <details key={i} className="border-b border-white/10 group">
                  <summary className="py-6 cursor-pointer text-lg font-medium list-none flex items-center justify-between">
                    {faq.question}
                    <span className="text-[#d4af37] group-open:rotate-45 transition-transform text-xl">+</span>
                  </summary>
                  <div className="pb-6 text-white/50 leading-relaxed">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="py-28 md:py-36 bg-[#0a0a0a] px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[#d4af37] text-sm uppercase tracking-[0.3em]">Kontakt</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.contact.title}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-white/10">
            {sections.contact.phone && (
              <div className="bg-[#0a0a0a] p-8 text-center group hover:bg-[#111] transition-colors">
                <div className="text-xs uppercase tracking-[0.3em] text-white/30 mb-4">Telefon</div>
                <a href={`tel:${sections.contact.phone}`} className="text-xl group-hover:text-[#d4af37] transition-colors">{sections.contact.phone}</a>
              </div>
            )}
            {sections.contact.email && (
              <div className="bg-[#0a0a0a] p-8 text-center group hover:bg-[#111] transition-colors">
                <div className="text-xs uppercase tracking-[0.3em] text-white/30 mb-4">E-Mail</div>
                <a href={`mailto:${sections.contact.email}`} className="text-xl group-hover:text-[#d4af37] transition-colors break-all">{sections.contact.email}</a>
              </div>
            )}
            {sections.contact.address && (
              <div className="bg-[#0a0a0a] p-8 text-center">
                <div className="text-xs uppercase tracking-[0.3em] text-white/30 mb-4">Adresse</div>
                <p className="text-xl text-white/60">{sections.contact.address}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="py-28 md:py-36 bg-[#d4af37] px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl md:text-6xl font-bold text-black leading-tight">{sections.bookingCta.headline}</h2>
              <p className="text-lg text-black/60 mt-4">{sections.bookingCta.description}</p>
            </div>
            <div className="flex justify-start lg:justify-end">
              <a href={sections.bookingCta.ctaLink} className="inline-flex items-center gap-3 bg-black text-white px-8 py-4 rounded-full font-semibold hover:bg-gray-900 transition-colors">
                {sections.bookingCta.ctaText}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-black border-t border-white/10">
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
