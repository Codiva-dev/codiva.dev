'use client';

import { useRef } from 'react';
import Heading from '../components/Heading';
import Button from '../components/ui/Button';
import TypewriterCycle from '../components/TypewriterCycle';
import { scrollToSectionCenter } from '../utils/scrollToSection';
import { useTranslation } from 'react-i18next';

export default function Hero() {
  const { t } = useTranslation();
  const heroRef = useRef(null);

  const staticText1 = t('hero.cleanCode');
  const staticText2 = t('hero.customTech');
  const staticText3 = t('hero.withoutNoise');

  return (
    <section
      id="hero"
      ref={heroRef}
      className="flex min-h-screen flex-col items-center justify-center bg-codiva-background px-6 pb-10 pt-[max(6rem,env(safe-area-inset-top,0px)+4.5rem)] text-center md:pt-[max(6.5rem,env(safe-area-inset-top,0px)+4.5rem)]"
    >
      <Heading
        as="h1"
        size="text-3xl sm:text-4xl md:text-6xl"
        className="mb-6 max-w-full text-balance leading-tight text-zinc-900"
      >
        {staticText1}{' '}
        <span className="text-codiva-primary">
          <TypewriterCycle className="text-codiva-primary" phrases={[staticText2]} loop={false} active />
        </span>
        <br className="hidden sm:block" />
        {' '}
        {staticText3}
      </Heading>

      <Button
        type="button"
        onClick={() => scrollToSectionCenter('services')}
        className="hero-cta mt-6"
      >
        {t('hero.viewServices')}
      </Button>
    </section>
  );
}
