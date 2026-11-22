import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import {
  CommandId,
  resolveThreadStar,
  type ScopedThreadRef,
  type ThreadStarColor,
} from "@t3tools/contracts";
import { useAtomValue } from "@effect/atom-react";
import * as Option from "effect/Option";
import { Atom } from "effect/reactivity";
import { msg, useGT } from "gt-react";

import { useStableCallback } from "../../hooks/useStableCallback";
import { m, type MessageResolver } from "../../i18n/messages";
import { randomUUID } from "../../lib/utils";
import { appAtomRegistry } from "../../rpc/atomRegistry";
import { readThreadShell } from "../../state/entities";
import { environmentShell } from "../../state/shell";
import { threadEnvironment } from "../../state/threads";
import { useAtomCommand } from "../../state/use-atom-command";
import { waitForAtomValue } from "../../state/waitForAtomValue";
import { stackedThreadToast } from "../ui/toast";

const nextColor = { green: "yellow", yellow: "blue", blue: null } as const;
export const threadStarClassName = {
  green: "text-green-600 dark:text-green-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  blue: "text-blue-600 dark:text-blue-400",
} satisfies Record<ThreadStarColor, string>;

export function threadStarLabel(color: ThreadStarColor | null, resolve: MessageResolver = m) {
  switch (color) {
    case null:
      return resolve(msg("Add green star"));
    case "green":
      return resolve(msg("Green star. Change to yellow"));
    case "yellow":
      return resolve(msg("Yellow star. Change to blue"));
    case "blue":
      return resolve(msg("Blue star. Remove star"));
  }
}

export interface PendingStar {
  readonly color: ThreadStarColor | null;
}

const pendingStarsAtom = Atom.make<ReadonlyMap<string, PendingStar>>(new Map()).pipe(
  Atom.keepAlive,
);

export function visibleThreadStar(
  thread: EnvironmentThreadShell,
  pending: PendingStar | undefined,
) {
  return pending === undefined ? resolveThreadStar(thread.source) : pending.color;
}

export function useThreadStars() {
  const gt = useGT();
  const setStar = useAtomCommand(threadEnvironment.setStar, { reportFailure: false });
  const pendingStars = useAtomValue(pendingStarsAtom);

  const cycleStar = useStableCallback(async (ref: ScopedThreadRef, onClear?: () => void) => {
    const key = scopedThreadKey(ref);
    const thread = readThreadShell(ref);
    if (thread === null) return;
    const pending = new Map(appAtomRegistry.get(pendingStarsAtom));
    const color = visibleThreadStar(thread, pending.get(key));
    const update = { color: color === null ? "green" : nextColor[color] } satisfies PendingStar;
    if (update.color === null) onClear?.();
    pending.set(key, update);
    appAtomRegistry.set(pendingStarsAtom, pending);

    const result = await setStar({
      environmentId: ref.environmentId,
      input: {
        type: "thread.star.set",
        commandId: CommandId.make(randomUUID()),
        threadId: ref.threadId,
        color: update.color,
      },
    });
    if (appAtomRegistry.get(pendingStarsAtom).get(key) !== update) return;
    if (result._tag === "Success") {
      await waitForAtomValue({
        registry: appAtomRegistry,
        atom: environmentShell.stateValueAtom(ref.environmentId),
        predicate: (shell) =>
          (Option.getOrNull(shell.snapshot)?.snapshotSequence ?? -1) >= result.value.sequence,
        timeoutMs: 5_000,
      });
    } else {
      stackedThreadToast({ type: "error", title: gt("Couldn't update thread star") });
    }
    const latest = appAtomRegistry.get(pendingStarsAtom);
    if (latest.get(key) === update) {
      const remaining = new Map(latest);
      remaining.delete(key);
      appAtomRegistry.set(pendingStarsAtom, remaining);
    }
  });

  return { pendingStars, cycleStar };
}
