'use client';

import { useTranslation } from 'react-i18next';
import { revealClass, useInView } from '../utils/inView';
import Heading from '../components/Heading';
import Paragraph from '../components/Paragraph';
import TypewriterCycle from '../components/TypewriterCycle';
import CodivaBrandText from '../components/CodivaBrandText';

export default function About() {
  const { t } = useTranslation();
  const [sectionRef, inView] = useInView(0.85);

  const productionTypes = t('about.productionTypes', { returnObjects: true });
  const typedPhrases = Array.isArray(productionTypes) ? productionTypes : [];
  const integrationTypes = t('about.integrationTypes', { returnObjects: true });
  const integrationPhrases = Array.isArray(integrationTypes) ? integrationTypes : [];

  return (
    <section
      id="about"
      className="section-spacing scroll-mt-24 md:scroll-mt-28 relative w-full px-6 md:px-12 flex justify-center bg-zinc-50"
    >
      <div
        ref={sectionRef}
        className="glass-panel relative w-full max-w-4xl rounded-2xl px-5 py-8 text-center sm:px-8 sm:py-12"
      >
        <div className={revealClass(inView)}>
          <Heading
            as="h2"
            size="text-2xl sm:text-3xl md:text-4xl"
            className="mb-6 text-balance text-codiva-primary"
            role="heading"
            aria-level={2}
          >
            <span className={revealClass(inView, 'reveal-delay-3')}>{t('about.title')}</span>
          </Heading>

          <noscript>
            <h2 style={{ display: 'none' }}>{t('about.title')}</h2>
            <p style={{ display: 'none' }}>
              {t('about.paragraph1Intro')}
              {typedPhrases.join(', ')}
              {t('about.paragraph1Outro')}{' '}
              {t('about.paragraph2Intro')}
              {integrationPhrases.join(', ')}
              {t('about.paragraph2Outro')}
            </p>
          </noscript>
        </div>

        <div className={revealClass(inView, 'reveal-delay-2')}>
          <Paragraph className="max-w-2xl mx-auto text-codiva-secondary text-base md:text-lg mb-4">
            <CodivaBrandText className="align-baseline">
              {t('about.paragraph1Intro')}
            </CodivaBrandText>
            <TypewriterCycle
              phrases={typedPhrases}
              typingMs={85}
              deletingMs={48}
              pauseMs={2800}
              className="font-medium text-codiva-primary"
              active={inView}
              trailingComma
            />
            {t('about.paragraph1Outro')}
          </Paragraph>

          <Paragraph className="max-w-2xl mx-auto text-zinc-600 text-base md:text-lg">
            {t('about.paragraph2Intro')}
            <TypewriterCycle
              phrases={integrationPhrases}
              typingMs={85}
              deletingMs={48}
              pauseMs={2800}
              className="font-medium text-codiva-primary"
              active={inView}
              trailingComma
            />
            <CodivaBrandText className="align-baseline">
              {t('about.paragraph2Outro')}
            </CodivaBrandText>
          </Paragraph>
        </div>
      </div>
    </section>
  );
}
