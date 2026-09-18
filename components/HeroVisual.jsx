'use client';

import { motion } from 'framer-motion';

const NODES = [
  { id: 'ui', label: 'Frontend', x: 18, y: 22 },
  { id: 'api', label: 'API', x: 50, y: 18 },
  { id: 'db', label: 'Database', x: 82, y: 22 },
  { id: 'auth', label: 'Auth', x: 28, y: 58 },
  { id: 'pay', label: 'Payments', x: 50, y: 72 },
  { id: 'ops', label: 'Ops', x: 72, y: 58 },
];

const EDGES = [
  ['ui', 'api'],
  ['api', 'db'],
  ['api', 'auth'],
  ['api', 'pay'],
  ['api', 'ops'],
  ['auth', 'db'],
];

export default function HeroVisual() {
  const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.15 }}
      className="relative mx-auto mt-10 w-full max-w-lg"
      aria-hidden="true"
    >
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6 md:p-8">
        <svg viewBox="0 0 100 88" className="h-auto w-full" fill="none">
          {EDGES.map(([from, to]) => {
            const a = nodeMap[from];
            const b = nodeMap[to];
            return (
              <line
                key={`${from}-${to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--codiva-primary)"
                strokeOpacity="0.22"
                strokeWidth="0.6"
              />
            );
          })}
          {NODES.map((node, i) => (
            <g key={node.id}>
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="5.5"
                fill="var(--codiva-primary)"
                fillOpacity="0.12"
                stroke="var(--codiva-primary)"
                strokeWidth="0.8"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
              />
              <text
                x={node.x}
                y={node.y + 11}
                textAnchor="middle"
                fill="var(--codiva-secondary)"
                fontSize="3.5"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="500"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-codiva-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-codiva-primary/5 blur-xl" />
      </div>
    </motion.div>
  );
}
