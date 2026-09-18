'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import casesMeta from '../utils/casesMeta';
import { CaseStudyLogo } from './CaseStudyLogo';
import { getLogoFrame } from '../utils/logoFrame';
import { motion, useInView } from 'framer-motion';

/** Logos landscape muy anchos se solapan en el arco superior; se escalan solo en esta vista. */
const NETWORK_LOGO_SCALE = 0.8;
/** Radio interior mayor = más separación angular en píxeles entre marcas. */
const INNER_RADIUS_RATIO = 0.58;
/** Rota la distribución para no concentrar wordmarks anchos en la misma zona. */
const PROJECT_ANGLE_OFFSET = Math.PI / 6;

const PILL_HEIGHT = 32;
const PILL_PAD_X = 20;
const PILL_GAP = 10;
const TECH_OUTER_RATIO = 0.98;
const TECH_INNER_RATIO = 0.78;
const COLLISION_PASSES = 8;

let measureCtx;

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function ellipseCircumference(rx, ry) {
  const h = ((rx - ry) ** 2) / ((rx + ry) ** 2 || 1);
  return Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

/** Punto a una fracción del perímetro (evita el agrupamiento de ángulos iguales). */
function pointOnEllipse(cx, cy, rx, ry, t) {
  const target = ((t % 1) + 1) % 1;
  const steps = 720;
  const circ = ellipseCircumference(rx, ry);
  const goal = target * circ;
  let acc = 0;
  let prevX = rx;
  let prevY = 0;
  for (let i = 1; i <= steps; i++) {
    const theta = (2 * Math.PI * i) / steps;
    const x = rx * Math.cos(theta);
    const y = ry * Math.sin(theta);
    const d = Math.hypot(x - prevX, y - prevY);
    if (acc + d >= goal) {
      const u = d === 0 ? 0 : (goal - acc) / d;
      return {
        x: cx + prevX + u * (x - prevX),
        y: cy + prevY + u * (y - prevY),
      };
    }
    acc += d;
    prevX = x;
    prevY = y;
  }
  return { x: cx + rx, y: cy };
}

function measureLabelWidth(text) {
  if (typeof document === 'undefined') return Math.ceil(text.length * 7.2 + PILL_PAD_X);
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d');
  }
  measureCtx.font = '12px ui-sans-serif, system-ui, sans-serif, "Segoe UI", Roboto, Arial';
  return Math.ceil(measureCtx.measureText(text).width) + PILL_PAD_X;
}

function boxesOverlap(a, b, gap = PILL_GAP) {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap &&
    Math.abs(a.y - b.y) < (a.h + b.h) / 2 + gap
  );
}

function splitByLength(techs) {
  const sorted = [...techs].sort((a, b) => b.length - a.length);
  const outer = [];
  const inner = [];
  sorted.forEach((tech, i) => {
    (i % 2 === 0 ? outer : inner).push(tech);
  });
  return { outer: shuffle(outer), inner: shuffle(inner) };
}

function placeRing(names, cx, cy, rx, ry, tOffset) {
  const n = names.length;
  if (n === 0) return [];
  return names.map((name, idx) => {
    const w = measureLabelWidth(name);
    const t = (idx + tOffset) / n;
    const pos = pointOnEllipse(cx, cy, rx, ry, t);
    return {
      name,
      w,
      h: PILL_HEIGHT,
      ringRx: rx,
      ringRy: ry,
      t,
      x: pos.x,
      y: pos.y,
    };
  });
}

function reproject(tech, cx, cy) {
  const pos = pointOnEllipse(cx, cy, tech.ringRx, tech.ringRy, tech.t);
  return { ...tech, x: pos.x, y: pos.y };
}

function orbitParams(idx) {
  return {
    r: 5 + (idx % 4),
    duration: 12 + (idx % 6),
    delay: -((idx * 1.37) % 12),
    reverse: idx % 2 === 1,
  };
}

function resolveCollisions(techs, projects, cx, cy) {
  const next = techs.map((t) => ({ ...t }));
  const obstacles = projects.map((p) => ({ x: p.x, y: p.y, w: p.width, h: p.height }));

  for (let pass = 0; pass < COLLISION_PASSES; pass++) {
    for (let i = 0; i < next.length; i++) {
      for (const obs of obstacles) {
        if (!boxesOverlap(next[i], obs, 6)) continue;
        next[i].t += 0.012 * (i % 2 === 0 ? 1 : -1);
        next[i] = reproject(next[i], cx, cy);
      }
      for (let j = i + 1; j < next.length; j++) {
        if (!boxesOverlap(next[i], next[j])) continue;
        const push = 0.008;
        let dt = next[j].t - next[i].t;
        if (dt > 0.5) dt -= 1;
        if (dt < -0.5) dt += 1;
        const dir = dt >= 0 ? -1 : 1;
        next[i].t += push * dir;
        next[j].t -= push * dir;
        next[i] = reproject(next[i], cx, cy);
        next[j] = reproject(next[j], cx, cy);
      }
    }
  }
  return next;
}

export default function TechProjectNetwork() {
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredProject, setHoveredProject] = useState(null);
  const [hoveredTech, setHoveredTech] = useState(null);

  const isInView = useInView(containerRef, { threshold: 0.2 });

  useEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    }
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const shuffledTechList = useMemo(() => {
    const techListRaw = Array.from(new Set(casesMeta.flatMap((c) => c.tech)));
    return shuffle(techListRaw);
  }, []);

  const techRings = useMemo(() => splitByLength(shuffledTechList), [shuffledTechList]);

  const allItems = useMemo(
    () => [
      ...casesMeta.map((c) => ({ type: 'project', name: c.name })),
      ...shuffledTechList.map((t) => ({ type: 'tech', name: t })),
    ],
    [shuffledTechList]
  );

  const layout = useMemo(() => {
    const { width, height } = dimensions;
    if (!width || !height) {
      return { techPositions: [], projectPositions: [] };
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const longest = shuffledTechList.reduce((m, name) => Math.max(m, measureLabelWidth(name)), 80);
    const padX = longest / 2 + 8;
    const padY = PILL_HEIGHT / 2 + 8;
    const outerRadiusX = Math.max(40, centerX - padX);
    const outerRadiusY = Math.max(40, centerY - padY);
    const innerRadiusX = outerRadiusX * INNER_RADIUS_RATIO;
    const innerRadiusY = outerRadiusY * INNER_RADIUS_RATIO;

    const projectPositions = casesMeta.map((p, idx) => {
      const frame = getLogoFrame(p);
      const scale = NETWORK_LOGO_SCALE * (p.networkScale ?? 1);
      const logoWidth = frame.width * scale;
      const logoHeight = frame.height * scale;
      const n = casesMeta.length;
      const angle = (2 * Math.PI * idx) / n + PROJECT_ANGLE_OFFSET;
      return {
        name: p.name,
        logo: p.logo,
        url: p.url,
        width: logoWidth,
        height: logoHeight,
        lineOffset: Math.max(logoWidth, logoHeight) / 2,
        x: centerX + innerRadiusX * Math.cos(angle),
        y: centerY + innerRadiusY * Math.sin(angle),
      };
    });

    const outerTechs = placeRing(
      techRings.outer,
      centerX,
      centerY,
      outerRadiusX * TECH_OUTER_RATIO,
      outerRadiusY * TECH_OUTER_RATIO,
      0
    );
    const innerTechs = placeRing(
      techRings.inner,
      centerX,
      centerY,
      outerRadiusX * TECH_INNER_RATIO,
      outerRadiusY * TECH_INNER_RATIO,
      0.5
    );

    return {
      techPositions: resolveCollisions([...outerTechs, ...innerTechs], projectPositions, centerX, centerY),
      projectPositions,
    };
  }, [dimensions, shuffledTechList, techRings]);

  const { techPositions, projectPositions } = layout;

  const applyOffset = (from, to, distance) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return { x: from.x, y: from.y };
    const offsetX = (dx / length) * distance;
    const offsetY = (dy / length) * distance;
    return {
      x: from.x + offsetX,
      y: from.y + offsetY,
    };
  };

  const startAutoHover = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
      setHoveredProject(randomItem.type === 'project' ? randomItem.name : null);
      setHoveredTech(randomItem.type === 'tech' ? randomItem.name : null);
    }, 3000);
  };

  useEffect(() => {
    startAutoHover();
    return () => clearInterval(intervalRef.current);
  }, [allItems]);

  const handleMouseEnterProject = (name) => {
    clearInterval(intervalRef.current);
    setHoveredProject(name);
    setHoveredTech(null);
  };

  const handleMouseEnterTech = (name) => {
    clearInterval(intervalRef.current);
    setHoveredTech(name);
    setHoveredProject(null);
  };

  const handleMouseLeave = () => {
    setHoveredProject(null);
    setHoveredTech(null);
    startAutoHover();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-[920px] h-[920px] select-none"
    >
      <svg width="100%" height="100%" className="absolute top-0 left-0 z-0">
        {casesMeta.flatMap((project) => {
          const projPos = projectPositions.find((p2) => p2.name === project.name);
          return project.tech.map((tech) => {
            const techPos = techPositions.find((t) => t.name === tech);
            if (!projPos || !techPos) return null;

            const logoOffset = applyOffset(projPos, techPos, projPos.lineOffset);

            const isHighlighted =
              (hoveredProject && hoveredProject === project.name) ||
              (hoveredTech && hoveredTech === tech);

            const baseOpacity = hoveredProject || hoveredTech ? (isHighlighted ? 1 : 0.1) : 0.4;
            const lineWidth = isHighlighted ? 2 : 1;

            return (
              <motion.line
                key={`${project.name}-${tech}`}
                x1={techPos.x}
                y1={techPos.y}
                x2={logoOffset.x}
                y2={logoOffset.y}
                stroke={isHighlighted ? 'var(--codiva-primary)' : 'var(--codiva-secondary)'}
                strokeWidth={lineWidth}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={isInView ? { pathLength: 1, opacity: baseOpacity } : { pathLength: 0, opacity: 0 }}
                transition={{ duration: 1, ease: 'easeInOut' }}
              />
            );
          });
        })}
      </svg>

      {techPositions.map((tech, idx) => {
        const isHighlighted =
          (hoveredProject &&
            casesMeta.find((c) => c.name === hoveredProject)?.tech.includes(tech.name)) ||
          hoveredTech === tech.name;
        const orbit = orbitParams(idx);

        return (
          <div
            key={tech.name}
            className="absolute"
            style={{
              left: tech.x,
              top: tech.y,
              zIndex: isHighlighted ? 25 : 10,
            }}
          >
            <div
              className="case-orbit"
              style={{
                '--orbit-r': `${orbit.r}px`,
                '--orbit-duration': `${orbit.duration}s`,
                '--orbit-delay': `${orbit.delay}s`,
                animationDirection: orbit.reverse ? 'reverse' : 'normal',
              }}
            >
              <motion.div
                className="absolute text-xs leading-none rounded-full border border-codiva-secondary whitespace-nowrap shadow-sm"
                style={{
                  x: '-50%',
                  y: '-50%',
                  height: `${PILL_HEIGHT}px`,
                  paddingLeft: '10px',
                  paddingRight: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isHighlighted ? 'var(--codiva-primary)' : 'var(--codiva-muted)',
                  color: isHighlighted ? '#FFFFFF' : 'var(--codiva-secondary)',
                }}
                transition={{ duration: 0.6, delay: idx * 0.05 }}
                whileHover={{ scale: 1.08 }}
                onMouseEnter={() => handleMouseEnterTech(tech.name)}
                onMouseLeave={handleMouseLeave}
              >
                {tech.name}
              </motion.div>
            </div>
          </div>
        );
      })}

      {projectPositions.map((project, idx) => (
        <motion.a
          key={project.name}
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute box-border flex items-center justify-center p-2"
          style={{
            left: `${project.x - project.width / 2}px`,
            top: `${project.y - project.height / 2}px`,
            width: `${project.width}px`,
            height: `${project.height}px`,
            zIndex: 20,
          }}
          transition={{ duration: 0.6, delay: idx * 0.05 + 0.3 }}
          onMouseEnter={() => handleMouseEnterProject(project.name)}
          onMouseLeave={handleMouseLeave}
        >
          <CaseStudyLogo
            item={casesMeta.find((c) => c.name === project.name) ?? { logo: project.logo }}
            alt={project.name}
            className="max-h-full max-w-full cursor-pointer object-contain"
            motionProps={{
              whileHover: { scale: 1.08 },
              transition: { type: 'spring', stiffness: 260, damping: 20 },
            }}
          />
        </motion.a>
      ))}
    </div>
  );
}
