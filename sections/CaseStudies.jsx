'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Heading from '../components/Heading';
import casesMeta from '../utils/casesMeta';
import CaseStudiesMobile from '../components/CaseStudiesMobile';

const TechProjectNetwork = dynamic(
  () => import('../components/TechProjectNetwork'),
  { ssr: false }
);

function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export default function CaseStudies() {
  const { t } = useTranslation();
  const [logos, setLogos] = useState(casesMeta);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const networkMinWidth = 1024;
    const sync = () => setIsMobile(window.innerWidth < networkMinWidth);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  useEffect(() => {
    setLogos(shuffleArray(casesMeta));
  }, []);

  return (
    <section
      id="casos"
      className="section-spacing scroll-mt-24 md:scroll-mt-28 w-full px-6 md:px-12 flex flex-col items-center bg-zinc-50"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.3 }}
        className="w-full max-w-4xl min-w-0 rounded-xl bg-white px-5 py-8 text-center shadow-lg sm:px-8 sm:py-12 lg:max-w-6xl"
      >
        <motion.div variants={fadeInUp}>
          <Heading
            as="h2"
            id="casos-heading"
            size="text-2xl sm:text-3xl md:text-4xl"
            className="mb-6 text-balance text-codiva-primary"
          >
            {t('cases.title')}
          </Heading>
        </motion.div>

        <motion.p
          variants={fadeInUp}
          className="text-zinc-600 text-base md:text-lg mb-10"
        >
          {t('cases.description')}
        </motion.p>

        <motion.div variants={fadeInUp} className="mt-12 min-h-[12rem] lg:min-h-[920px]">
          {isMobile ? (
            <CaseStudiesMobile logos={logos} />
          ) : (
            <TechProjectNetwork />
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
