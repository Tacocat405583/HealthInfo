import { useNavigate } from 'react-router';
import { Activity, Shield, MessageSquare, Zap, CheckCircle, ArrowRight, Users, Clock } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center">
              <div className="w-2 h-3 border-2 border-white border-t-0 rounded-b-sm" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground leading-tight">HealthVault</p>
            <p className="text-xs text-muted-foreground">Your health, simplified</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/patient')}
            className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors text-sm"
          >
            Patient Sign In
          </button>
          <button
            onClick={() => navigate('/doctor')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            Doctor Sign In
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 bg-gradient-to-br from-background via-muted/30 to-accent/30">
        <h1 className="text-5xl font-bold text-foreground max-w-3xl leading-tight mb-6">
          Healthcare Communication,{' '}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Finally Done Right
          </span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mb-10">
          HealthVault connects patients and providers through a modern, intuitive platform —
          so you can spend less time navigating clunky software and more time focused on care.
        </p>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          <button
            onClick={() => navigate('/patient')}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Access Patient Portal
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/doctor')}
            className="flex items-center gap-2 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-accent transition-colors font-medium"
          >
            Provider Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6 bg-card">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything MyChart should have been
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We rebuilt the patient portal experience from the ground up — faster, cleaner,
              and actually designed for humans.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: 'Instant Results Access',
                desc: 'Lab results, imaging reports, and vitals available the moment your provider releases them — no more waiting for a phone call.',
              },
              {
                icon: MessageSquare,
                title: 'Direct Secure Messaging',
                desc: 'Message your care team directly. HIPAA-compliant, threaded conversations so nothing gets lost.',
              },
              {
                icon: Clock,
                title: 'Smart Scheduling',
                desc: 'Book, reschedule, or join telehealth visits in seconds. Calendar sync and reminders built in.',
              },
              {
                icon: Activity,
                title: 'Health Tracking',
                desc: 'Monitor trends in your vitals, medications, and wellness metrics over time in one unified view.',
              },
              {
                icon: Users,
                title: 'Provider Collaboration',
                desc: 'Your care team shares a single coordinated view of your health — no more repeating your history.',
              },
              {
                icon: Shield,
                title: 'Privacy First',
                desc: 'End-to-end encryption and role-based access ensure your data is only seen by those you authorize.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-background border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-foreground font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison banner ── */}
      <section className="py-16 px-6 bg-muted/40">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">
            How we compare
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <p className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                Legacy Portals (MyChart, etc.)
              </p>
              {[
                'Slow, outdated interfaces',
                'Confusing navigation',
                'Delayed result notifications',
                'Limited provider communication',
                'Poor mobile experience',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 mb-3">
                  <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-destructive text-xs font-bold">✕</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-white">
              <p className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wide">
                HealthVault
              </p>
              {[
                'Modern, lightning-fast UI',
                'Intuitive design, zero learning curve',
                'Real-time result delivery',
                'Direct, threaded provider messaging',
                'Fully responsive on any device',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-white/80 flex-shrink-0" />
                  <p className="text-sm text-white/90">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 bg-card text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to experience better healthcare?
          </h2>
          <p className="text-muted-foreground mb-8">
            Sign in to your patient portal or provider dashboard to get started.
          </p>
          <div className="flex items-center gap-4 justify-center flex-wrap">
            <button
              onClick={() => navigate('/patient')}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              Patient Sign In
            </button>
            <button
              onClick={() => navigate('/doctor')}
              className="px-6 py-3 border border-border text-foreground rounded-lg hover:bg-accent transition-colors font-medium"
            >
              Doctor Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-background border-t border-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <div className="w-4 h-4 border-2 border-white rounded-full flex items-center justify-center">
                <div className="w-1.5 h-2 border-2 border-white border-t-0 rounded-b-sm" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">HealthVault</p>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 HealthVault. Built at PantherHacks.
          </p>
        </div>
      </footer>
    </div>
  );
}
