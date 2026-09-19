'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  isWorkStatus,
  mergeRealtimeAssignment,
  type WorkAssignment,
} from '@/lib/ops/work-board';

export type WorkBoardPresence = {
  id: string;
  name: string;
  assignmentId: string;
};

function asText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function useWorkBoardRealtime(opts: {
  setAssignments: Dispatch<SetStateAction<WorkAssignment[]>>;
  staff: Array<{ id: string; full_name: string }>;
  currentUserId: string;
  currentUserName: string;
  selectedId: string;
  onPresence: (rows: WorkBoardPresence[]) => void;
  remoteChangeLabel: string;
}) {
  const router = useRouter();
  const refreshTimer = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const staffRef = useRef(opts.staff);
  const setAssignmentsRef = useRef(opts.setAssignments);
  const onPresenceRef = useRef(opts.onPresence);
  const labelRef = useRef(opts.remoteChangeLabel);
  const userIdRef = useRef(opts.currentUserId);
  const userNameRef = useRef(opts.currentUserName);
  const selectedIdRef = useRef(opts.selectedId);
  staffRef.current = opts.staff;
  setAssignmentsRef.current = opts.setAssignments;
  onPresenceRef.current = opts.onPresence;
  labelRef.current = opts.remoteChangeLabel;
  userIdRef.current = opts.currentUserId;
  userNameRef.current = opts.currentUserName;
  selectedIdRef.current = opts.selectedId;

  useEffect(() => {
    const supabase = createClient();

    function scheduleRefresh() {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        router.refresh();
      }, 250);
    }

    const channel = supabase
      .channel('ops-work-board')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_assignments' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const id = asText(payload.old?.id);
            if (id) setAssignmentsRef.current((prev) => prev.filter((row) => row.id !== id));
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row) return;
          const staffName = new Map(staffRef.current.map((item) => [item.id, item.full_name]));
          setAssignmentsRef.current((prev) => {
            const merged = mergeRealtimeAssignment(prev, row, staffName);
            if (!merged) {
              scheduleRefresh();
              return prev;
            }
            const previous = prev.find((item) => item.id === asText(row.id));
            const nextStatus = asText(row.status);
            if (previous && isWorkStatus(nextStatus) && previous.status !== nextStatus) {
              toast(labelRef.current);
            }
            return merged;
          });
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_assignment_subtasks' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_assignment_comments' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_assignment_mentions' }, scheduleRefresh)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<
          string,
          Array<{ id?: string; name?: string; assignmentId?: string }>
        >;
        const rows: WorkBoardPresence[] = [];
        for (const list of Object.values(state)) {
          for (const row of list) {
            if (!row.id || row.id === userIdRef.current) continue;
            rows.push({
              id: row.id,
              name: row.name || 'Staff',
              assignmentId: row.assignmentId || '',
            });
          }
        }
        onPresenceRef.current(rows);
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        void channel.track({
          id: userIdRef.current,
          name: userNameRef.current,
          assignmentId: selectedIdRef.current,
        });
      });

    channelRef.current = channel;

    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel) return;
    void channel.track({
      id: opts.currentUserId,
      name: opts.currentUserName,
      assignmentId: opts.selectedId,
    });
  }, [opts.currentUserId, opts.currentUserName, opts.selectedId]);
}
