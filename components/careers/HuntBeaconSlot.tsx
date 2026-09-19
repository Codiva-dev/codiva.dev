'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HUNT_SESSION_EVENT, isHuntToken } from '@/lib/careers/hunt/cookie';
import { readHuntCookie, readHuntContext } from '@/components/careers/hunt-context';

const HuntBeacon = dynamic(() => import('@/components/careers/HuntBeacon'), { ssr: false });

function huntTokenActive() {
  return isHuntToken(readHuntCookie() || readHuntContext()?.token);
}

/** Loads HuntBeacon only after a hunt session exists, so marketing JS stays small. */
export default function HuntBeaconSlot() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(huntTokenActive());
    sync();
    window.addEventListener(HUNT_SESSION_EVENT, sync);
    return () => window.removeEventListener(HUNT_SESSION_EVENT, sync);
  }, []);

  if (!active) return null;
  return <HuntBeacon />;
}
