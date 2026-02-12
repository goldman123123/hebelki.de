import type { TemplateProps } from './types'

export function GlassmorphismTemplate({ business, sections }: TemplateProps) {
  return (
    <div className="template-glassmorphism min-h-screen relative">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-2/3 left-1/2 w-64 h-64 bg-[#d4af37]/10 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
      </div>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="glass-card inline-block px-6 py-2 rounded-full mb-8">
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-400">{business.tagline || business.name}</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8">
            <span className="glass-gradient-text">{sections.hero.headline}</span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10">{sections.hero.subheadline}</p>
          <a href={sections.hero.ctaLink} className="inline-block bg-emerald-500 hover:bg-emerald-400 text-white px-10 py-4 rounded-full text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_30px_rgba(39,174,96,0.4)]">
            {sections.hero.ctaText}
          </a>
        </div>
      </section>

      {/* About */}
      <section className="relative py-28 md:py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-emerald-400">Über uns</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-8">{sections.about.title}</h2>
              <p className="text-lg text-white/60 leading-relaxed">{sections.about.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {sections.about.stats.map((stat, i) => (
                <div key={i} className="glass-card-strong rounded-2xl p-8 text-center">
                  <div className="text-3xl font-bold text-emerald-400 mb-2">{stat.value}</div>
                  <div className="text-sm text-white/40">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="relative py-28 md:py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.3em] text-cyan-400">Leistungen</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.services.title}</h2>
            <p className="text-lg text-white/40 mt-4 max-w-2xl mx-auto">{sections.services.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.services.items.map((service) => (
              <div key={service.id} className="glass-card-strong rounded-2xl p-8 group">
                <h3 className="text-xl font-bold mb-3 group-hover:text-emerald-400 transition-colors">{service.name}</h3>
                <p className="text-white/40 text-sm mb-4 leading-relaxed">{service.description}</p>
                <div className="flex items-center justify-between text-sm pt-4 border-t border-white/5">
                  {service.price && <span className="text-emerald-400 font-semibold">{service.price}</span>}
                  <span className="text-white/20">{service.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {sections.testimonials.items.length > 0 && (
        <section className="relative py-28 md:py-36 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-[0.3em] text-emerald-400">Bewertungen</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.testimonials.title}</h2>
              <p className="text-lg text-white/40 mt-4 max-w-2xl mx-auto">{sections.testimonials.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.testimonials.items.map((item, i) => (
                <div key={i} className="glass-card-strong rounded-2xl p-8">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <span key={s} className={s < item.rating ? 'text-emerald-400' : 'text-white/10'}>&#9733;</span>
                    ))}
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed mb-6">&ldquo;{item.text}&rdquo;</p>
                  <div className="pt-4 border-t border-white/5">
                    <span className="text-sm font-semibold text-white/80">{item.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      {sections.howItWorks.steps.length > 0 && (
        <section className="relative py-28 md:py-36 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-[0.3em] text-cyan-400">So funktioniert&apos;s</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.howItWorks.title}</h2>
              <p className="text-lg text-white/40 mt-4 max-w-2xl mx-auto">{sections.howItWorks.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {sections.howItWorks.steps.map((step, i) => (
                <div key={i} className="glass-card-strong rounded-2xl p-8 text-center relative">
                  <div className="w-12 h-12 mx-auto mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg font-bold text-emerald-400">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team */}
      {sections.team.members.length > 0 && (
        <section className="relative py-28 md:py-36 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-[0.3em] text-emerald-400">Team</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.team.title}</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sections.team.members.map((member) => (
                <div key={member.id} className="glass-card rounded-2xl p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-bold text-emerald-400 overflow-hidden">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  <h3 className="text-lg font-bold">{member.name}</h3>
                  <p className="text-sm text-emerald-400/70 mb-2">{member.title}</p>
                  <p className="text-sm text-white/30">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      {sections.benefits.items.length > 0 && (
        <section className="relative py-28 md:py-36 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-[0.3em] text-cyan-400">Vorteile</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.benefits.title}</h2>
              <p className="text-lg text-white/40 mt-4 max-w-2xl mx-auto">{sections.benefits.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.benefits.items.map((item, i) => (
                <div key={i} className="glass-card-strong rounded-2xl p-8 group">
                  <div className="w-10 h-10 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="text-lg font-bold mb-3 group-hover:text-emerald-400 transition-colors">{item.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {sections.faq.items.length > 0 && (
        <section className="relative py-28 md:py-36 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-[0.3em] text-cyan-400">FAQ</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4">{sections.faq.title}</h2>
            </div>
            <div className="space-y-4">
              {sections.faq.items.map((faq, i) => (
                <details key={i} className="glass-card rounded-xl group">
                  <summary className="px-6 py-4 cursor-pointer text-lg font-medium list-none flex items-center justify-between">
                    {faq.question}
                    <span className="text-emerald-400 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="px-6 pb-4 text-white/50 leading-relaxed border-t border-white/5 pt-4">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="relative py-28 md:py-36 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-emerald-400">Kontakt</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-12">{sections.contact.title}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {sections.contact.phone && (
              <div className="glass-card-strong rounded-xl p-8">
                <div className="text-sm text-white/30 uppercase tracking-wider mb-3">Telefon</div>
                <a href={`tel:${sections.contact.phone}`} className="text-lg text-emerald-400 hover:underline">{sections.contact.phone}</a>
              </div>
            )}
            {sections.contact.email && (
              <div className="glass-card-strong rounded-xl p-8">
                <div className="text-sm text-white/30 uppercase tracking-wider mb-3">E-Mail</div>
                <a href={`mailto:${sections.contact.email}`} className="text-lg text-emerald-400 hover:underline break-all">{sections.contact.email}</a>
              </div>
            )}
            {sections.contact.address && (
              <div className="glass-card-strong rounded-xl p-8">
                <div className="text-sm text-white/30 uppercase tracking-wider mb-3">Adresse</div>
                <p className="text-lg text-white/60">{sections.contact.address}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="relative py-28 md:py-36 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 glass-gradient-text">{sections.bookingCta.headline}</h2>
          <p className="text-lg text-white/50 mb-10">{sections.bookingCta.description}</p>
          <a href={sections.bookingCta.ctaLink} className="inline-block bg-emerald-500 hover:bg-emerald-400 text-white px-12 py-4 rounded-full text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_40px_rgba(39,174,96,0.4)]">
            {sections.bookingCta.ctaText}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center text-sm text-white/20">
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
