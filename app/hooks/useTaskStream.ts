"use client";

import { useEffect, useRef } from "react";
import type { TaskEvent } from "@/types";

export function useTaskStream(taskId: string | null, onEvent: (e: TaskEvent) => void) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    if (!taskId) return;
    const es = new EventSource(`/api/tasks/${taskId}/stream`);

    const handler = (raw: MessageEvent) => {
      try {
        const event = JSON.parse(raw.data as string) as TaskEvent;
        onEventRef.current(event);
      } catch {
        // ignored
      }
    };

    const eventTypes: TaskEvent["type"][] = [
      "task.phase.changed",
      "assistant.message.delta",
      "assistant.question.generated",
      "task.log",
      "report.section.added",
      "report.finalized",
      "task.error",
    ];
    eventTypes.forEach((t) => es.addEventListener(t, handler));

    return () => {
      eventTypes.forEach((t) => es.removeEventListener(t, handler));
      es.close();
    };
  }, [taskId]);
}
