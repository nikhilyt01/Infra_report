'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import Navbar from "@/components/Navbar";
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  BarChart3, CheckCircle, Building, Camera, Map, 
  TrendingUp, Shield, ArrowRight, Activity, MapPin,
  Clock, Users, Sparkles
} from 'lucide-react';

export default function HomePage() {
  const t = useTranslations('Home');
  const params = useParams();
  const locale = params.locale as string;
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      
      {/* Floating Language Switcher */}
      <div className="fixed top-20 right-4 z-40">
        <LanguageSwitcher />
      </div>
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden border-b border-border/60 bg-gradient-to-b from-secondary/50 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modern Civic Infrastructure Management</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.15]">
              {t('subtitle')}
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {t('description')}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href={`/${locale}/reports/new`} className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto px-7 py-6 text-base font-medium shadow-sm flex items-center justify-center gap-2">
                  <span>{t('getStarted')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link href={`/${locale}/map`} className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-7 py-6 text-base font-medium flex items-center justify-center gap-2">
                  <Map className="w-4 h-4 text-muted-foreground" />
                  <span>Explore Issue Map</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-16 sm:mt-20">
            {[
              { value: '10K+', label: t('stats.reports'), icon: BarChart3 },
              { value: '85%', label: t('stats.resolved'), icon: CheckCircle },
              { value: '50+', label: t('stats.cities'), icon: Building },
              { value: '24/7', label: t('stats.support'), icon: Activity }
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex flex-col items-center text-center hover:border-border transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-28 bg-secondary/30 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {t('howItWorks.title')}
            </h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              A transparent, 3-step workflow connecting citizens directly with civic authorities.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { 
                step: '01',
                title: t('howItWorks.step1.title'), 
                desc: t('howItWorks.step1.description'),
                icon: Camera
              },
              { 
                step: '02',
                title: t('howItWorks.step2.title'), 
                desc: t('howItWorks.step2.description'),
                icon: Users
              },
              { 
                step: '03',
                title: t('howItWorks.step3.title'), 
                desc: t('howItWorks.step3.description'),
                icon: CheckCircle
              },
            ].map((item, index) => (
              <Card key={index} className="border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-colors relative">
                <CardContent className="p-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-bold text-muted-foreground/40 font-mono">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Grid */}
      <section className="py-20 md:py-28 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Enterprise Features Built for Scale
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Everything required to report, assign, track, and resolve infrastructure challenges.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                icon: Map, 
                title: t('features.map.title'), 
                desc: t('features.map.description')
              },
              { 
                icon: TrendingUp, 
                title: t('features.track.title'), 
                desc: t('features.track.description')
              },
              { 
                icon: Camera, 
                title: t('features.ai.title'), 
                desc: t('features.ai.description')
              },
              { 
                icon: MapPin, 
                title: 'Nearby GPS Detection', 
                desc: 'Automatically discover pending infrastructure repairs near your exact coordinates'
              },
              { 
                icon: Clock, 
                title: 'Real-time Status Tracking', 
                desc: 'Stay informed with instant updates from submission to municipal verification'
              },
              { 
                icon: Shield, 
                title: 'Secure & Verified', 
                desc: 'Encrypted reporting and manager approval workflow for civic transparency'
              },
            ].map((feature, index) => (
              <Card key={index} className="border border-border/80 bg-card hover:border-border transition-all shadow-xs">
                <CardContent className="p-7 space-y-3.5">
                  <div className="w-10 h-10 rounded-lg bg-secondary text-primary flex items-center justify-center">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            {t('cta')}
          </h2>
          <p className="text-base sm:text-lg text-primary-foreground/80 max-w-xl mx-auto">
            Join thousands of active citizens and municipal teams working together to modernize infrastructure.
          </p>
          <div className="pt-2">
            <Link href={`/${locale}/reports/new`}>
              <Button size="lg" variant="secondary" className="px-8 py-6 text-base font-semibold text-foreground bg-white hover:bg-white/90 shadow-md">
                <Camera className="w-4 h-4 mr-2" />
                <span>{t('getStarted')}</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-card py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                IR
              </div>
              <span className="text-sm font-semibold text-foreground">InfraReport Platform</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2026 InfraReport. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
