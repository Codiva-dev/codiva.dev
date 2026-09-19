'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { revealClass, useInView } from '../utils/inView';
import {
  Globe,
  Code2,
  Settings,
  ChevronDown,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import Heading from '../components/Heading';
import Paragraph from '../components/Paragraph';

const ICONS = [
  <Globe className="w-5 h-5 text-codiva-primary" />,
  <Code2 className="w-5 h-5 text-codiva-primary" />,
  <Settings className="w-5 h-5 text-codiva-primary" />,
];

export default function Services() {
  const { t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [sectionRef, inView] = useInView(0.6);

  const services = t('services.list', { returnObjects: true });

  return (
    <section
      id="services"
      ref={sectionRef}
      className="section-spacing scroll-mt-24 md:scroll-mt-28 w-full px-6 md:px-12 flex justify-center bg-zinc-50"
    >
      <div className="w-full max-w-6xl rounded-2xl bg-white px-5 py-8 text-center shadow-md sm:px-8 sm:py-12 md:px-12">
        <div className={revealClass(inView)}>
          <Heading
            as="h2"
            size="text-2xl sm:text-3xl md:text-4xl"
            className="mb-12 text-balance text-codiva-primary"
          >
            {t('services.title')}
          </Heading>

          <div className="grid grid-cols-1 items-start md:grid-cols-3 gap-8 text-left">
            {services.map((service, index) => {
              const isExpanded = expandedIndex === index;
              const detailsId = `service-details-${index}`;
              const prices = t('services.prices', { returnObjects: true });
              const price = Array.isArray(prices) ? prices[index] : '';

              return (
                <div
                  key={index}
                  className={`relative flex min-w-0 flex-col justify-start rounded-xl border p-5 shadow-sm transition-transform duration-300 hover:shadow-md sm:p-6 ${
                    service.badge ? 'border-codiva-primary/30 bg-codiva-primary/5' : 'border-zinc-100'
                  }`}
                >
                  {service.badge && (
                    <span className="absolute right-3 top-3 rounded-full bg-codiva-primary px-3 py-1 text-[11px] font-medium text-white shadow-sm md:right-2 md:top-2 md:text-xs">
                      {service.badge}
                    </span>
                  )}

                  <div>
                    <h3
                      className={`mb-2 flex items-start gap-2 text-xl font-semibold text-zinc-900 ${
                        service.badge ? 'pr-16' : ''
                      }`}
                    >
                      {ICONS[index]}
                      {service.title}
                    </h3>

                    <Paragraph className="text-zinc-700 text-base mb-2">
                      {service.description}
                    </Paragraph>
                  </div>

                  <div className="mt-4">
                    <p
                      className="text-base text-codiva-primary font-semibold mb-3"
                      data-price={price}
                    >
                      {price}
                    </p>

                    <button
                      onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      className="flex items-center gap-1 text-sm text-zinc-600 hover:text-codiva-primary transition"
                    >
                      {isExpanded ? t('common.buttons.hide') : t('common.buttons.seeMore')}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <div
                      id={detailsId}
                      className={`grid transition-[grid-template-rows] duration-300 ${
                        isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-4 space-y-2 pl-1">
                          <ul className="space-y-2">
                            {service.details.map((item, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-zinc-600"
                              >
                                <CheckCircle className="text-codiva-primary shrink-0 w-4 h-4 md:w-5 md:h-5 mt-[2px] md:mt-[3px]" />
                                {item}
                              </li>
                            ))}
                          </ul>

                          {service.extras && (
                            <div className="mt-4">
                              <h4 className="text-sm font-semibold text-zinc-700 mb-2">
                                {t('services.extrasTitle')}
                              </h4>
                              <ul className="pl-1 space-y-1">
                                {service.extras.map((extra, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                                    <ChevronRight className="text-codiva-primary w-4 h-4 mt-[2px]" />
                                    {extra}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-center text-sm text-zinc-500">
            {t('services.priceNote')}
          </p>
        </div>
      </div>
    </section>
  );
}
