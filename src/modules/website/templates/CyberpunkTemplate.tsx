import type { TemplateProps } from './types'

export function CyberpunkTemplate({ business, sections }: TemplateProps) {
  return (
    <div className="template-cyberpunk min-h-screen relative">
      {/* Grid + scanlines */}
      <div className="fixed inset-0 cyber-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 cyber-scanlines opacity-30 pointer-events-none" />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <div className="cyber-border inline-block px-4 py-2 mb-8">
            <span className="font-mono text-sm text-[#00fff2] uppercase tracking-widest">{business.tagline || 'SYSTEM ONLINE'}</span>
          </div>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter leading-[0.85] mb-8">
            <span className="cyber-glitch text-white" data-text={sections.hero.headline}>{sections.hero.headline}</span>
          </h1>
          <p className="font-mono text-lg text-white/50 max-w-2xl mx-auto mb-12">{sections.hero.subheadline}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={sections.hero.ctaLink} className="cyber-button-primary px-10 py-4 font-mono uppercase tracking-wider text-sm">
              {sections.hero.ctaText}
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="relative py-28 md:py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="cyber-border inline-block px-4 py-2 mb-8">
                <span className="font-mono text-sm text-[#00fff2] uppercase tracking-widest">ÜBER UNS</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black uppercase mb-8">{sections.about.title}</h2>
              <p className="font-mono text-white/50 leading-relaxed">{sections.about.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {sections.about.stats.map((stat, i) => {
                const colors = ['neon-cyan', 'neon-magenta', 'neon-gold', 'neon-cyan']
                return (
                  <div key={i} className="cyber-card p-6 text-center">
                    <div className={`text-4xl font-black ${colors[i % colors.length]}`}>{stat.value}</div>
                    <div className="font-mono text-xs text-white/30 uppercase mt-2">{stat.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="relative py-28 md:py-36 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00fff2]/5 to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="cyber-border inline-block px-4 py-2 mb-8">
              <span className="font-mono text-sm text-[#ff00ff] uppercase tracking-widest">SERVICES</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black uppercase">{sections.services.title}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.services.items.map((service, i) => {
              const borderColors = ['border-[#00fff2]', 'border-[#ff00ff]', 'border-[#d4af37]']
              return (
                <div key={service.id} className={`cyber-card-glow p-8 border-l-4 ${borderColors[i % borderColors.length]}`}>
                  <h3 className="text-xl font-bold mb-3">{service.name}</h3>
                  <p className="font-mono text-sm text-white/40 mb-4">{service.description}</p>
                  <div className="flex items-center justify-between font-mono text-sm pt-4 border-t border-white/5">
                    {service.price && <span className="text-[#00fff2]">{service.price}</span>}
                    <span className="text-white/20">{service.duration}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {sections.testimonials.items.length > 0 && (
        <section className="relative py-28 md:py-36 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="cyber-border inline-block px-4 py-2 mb-8">
                <span className="font-mono text-sm text-[#d4af37] uppercase tracking-widest">TESTIMONIALS</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black uppercase">{sections.testimonials.title}</h2>
              <p className="font-mono text-white/40 mt-4 max-w-2xl mx-auto">{sections.testimonials.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.testimonials.items.map((item, i) => {
                const borderColors = ['border-[#00fff2]', 'border-[#ff00ff]', 'border-[#d4af37]']
                return (
                  <div key={i} className={`cyber-card p-8 border-l-4 ${borderColors[i % borderColors.length]}`}>
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <span key={s} className={`font-mono ${s < item.rating ? 'text-[#00fff2]' : 'text-white/10'}`}>&#9733;</span>
                      ))}
                    </div>
                    <p className="font-mono text-sm text-white/50 leading-relaxed mb-6">&ldquo;{item.text}&rdquo;</p>
                    <div className="pt-4 border-t border-white/5">
                      <span className="font-mono text-sm font-bold text-white/80 uppercase">{item.name}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      {sections.howItWorks.steps.length > 0 && (
        <section className="relative py-28 md:py-36 px-6">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#ff00ff]/5 to-transparent" />
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <div className="cyber-border inline-block px-4 py-2 mb-8">
                <span className="font-mono text-sm text-[#00fff2] uppercase tracking-widest">PROZESS</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black uppercase">{sections.howItWorks.title}</h2>
              <p className="font-mono text-white/40 mt-4 max-w-2xl mx-auto">{sections.howItWorks.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {sections.howItWorks.steps.map((step, i) => {
                const colors = ['text-[#00fff2]', 'text-[#ff00ff]', 'text-[#d4af37]']
                const borderColors = ['border-[#00fff2]', 'border-[#ff00ff]', 'border-[#d4af37]']
                return (
                  <div key={i} className="cyber-card p-8 text-center relative">
                    <div className={`w-14 h-14 mx-auto mb-6 border-2 ${borderColors[i % borderColors.length]} flex items-center justify-center font-mono text-xl font-black ${colors[i % colors.length]}`}>
                      {step.step}
                    </div>
                    <h3 className="text-xl font-bold uppercase mb-3">{step.title}</h3>
                    <p className="font-mono text-sm text-white/40 leading-relaxed">{step.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Team */}
      {sections.team.members.length > 0 && (
        <section className="relative py-28 md:py-36 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="cyber-border inline-block px-4 py-2 mb-8">
                <span className="font-mono text-sm text-[#d4af37] uppercase tracking-widest">TEAM</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black uppercase">{sections.team.title}</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.team.members.map((member) => (
                <div key={member.id} className="cyber-card p-8 text-center group hover:border-[#00fff2]/50 transition-colors">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full border border-[#00fff2]/30 bg-[#00fff2]/5 flex items-center justify-center text-2xl font-black text-[#00fff2] overflow-hidden">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  <h3 className="text-lg font-bold">{member.name}</h3>
                  <p className="font-mono text-xs text-[#ff00ff] uppercase mb-2">{member.title}</p>
                  <p className="font-mono text-sm text-white/30">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      {sections.benefits.items.length > 0 && (
        <section className="relative py-28 md:py-36 px-6">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#d4af37]/5 to-transparent" />
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <div className="cyber-border inline-block px-4 py-2 mb-8">
                <span className="font-mono text-sm text-[#ff00ff] uppercase tracking-widest">VORTEILE</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black uppercase">{sections.benefits.title}</h2>
              <p className="font-mono text-white/40 mt-4 max-w-2xl mx-auto">{sections.benefits.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.benefits.items.map((item, i) => {
                const borderColors = ['border-[#00fff2]', 'border-[#ff00ff]', 'border-[#d4af37]']
                const numColors = ['text-[#00fff2]', 'text-[#ff00ff]', 'text-[#d4af37]']
                return (
                  <div key={i} className={`cyber-card p-8 border-l-4 ${borderColors[i % borderColors.length]} group`}>
                    <div className={`font-mono text-xs ${numColors[i % numColors.length]} uppercase mb-4`}>[{String(i + 1).padStart(2, '0')}]</div>
                    <h3 className="text-lg font-bold uppercase mb-3">{item.title}</h3>
                    <p className="font-mono text-sm text-white/40 leading-relaxed">{item.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {sections.faq.items.length > 0 && (
        <section className="relative py-28 md:py-36 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black uppercase">{sections.faq.title}</h2>
            </div>
            <div className="space-y-4">
              {sections.faq.items.map((faq, i) => (
                <details key={i} className="cyber-card group">
                  <summary className="px-6 py-4 cursor-pointer font-bold list-none flex items-center justify-between font-mono">
                    {faq.question}
                    <span className="text-[#00fff2] group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="px-6 pb-4 font-mono text-sm text-white/40 border-t border-white/5 pt-4">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="relative py-28 md:py-36 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black uppercase mb-12">{sections.contact.title}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {sections.contact.phone && (
              <div className="cyber-card-glow p-8 border-l-4 border-[#00fff2]">
                <div className="font-mono text-xs text-white/30 uppercase mb-3">Telefon</div>
                <a href={`tel:${sections.contact.phone}`} className="text-lg text-[#00fff2] hover:underline font-mono">{sections.contact.phone}</a>
              </div>
            )}
            {sections.contact.email && (
              <div className="cyber-card-glow p-8 border-l-4 border-[#ff00ff]">
                <div className="font-mono text-xs text-white/30 uppercase mb-3">E-Mail</div>
                <a href={`mailto:${sections.contact.email}`} className="text-lg text-[#ff00ff] hover:underline font-mono break-all">{sections.contact.email}</a>
              </div>
            )}
            {sections.contact.address && (
              <div className="cyber-card-glow p-8 border-l-4 border-[#d4af37]">
                <div className="font-mono text-xs text-white/30 uppercase mb-3">Adresse</div>
                <p className="text-lg text-white/60 font-mono">{sections.contact.address}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="relative py-28 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#ff00ff]/10 to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black uppercase mb-8">
            <span className="cyber-glitch" data-text={sections.bookingCta.headline}>{sections.bookingCta.headline}</span>
          </h2>
          <p className="font-mono text-xl text-white/50 mb-12">{sections.bookingCta.description}</p>
          <a href={sections.bookingCta.ctaLink} className="cyber-button-primary px-10 py-4 font-mono uppercase tracking-wider text-sm inline-block">
            {sections.bookingCta.ctaText}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center font-mono text-sm text-white/20">
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
