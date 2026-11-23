import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import {
  CommandId,
  nextThreadStarColor,
  resolveThreadStar,
  type ThreadStarColor,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import { AsyncResult, Atom, AtomRegistry } from "effect/reactivity";
import { useGT } from "gt-react-native";
import { useCallback } from "react";

import * as Dialog from "../components/ui/Dialog";
import { scopedThreadKey } from "../lib/scopedEntities";
import { uuidv4 } from "../lib/uuid";
import { appAtomRegistry } from "./atom-registry";
import { mobilePreferencesAtom } from "./preferences";
import { environmentServerConfigsAtom } from "./server";
import { environmentShell } from "./shell";
import { environmentThreadShells, threadEnvironment } from "./threads";
import { useAtomCommand } from "./use-atom-command";

export const threadStarsAvailableAtom = Atom.make((get) => {
  const configs = get(environmentServerConfigsAtom);
  return (
    configs.size > 0 &&
    [...configs.values()].every((config) => config.environment.capabilities.threadStars === true)
  );
});

export const threadStarsEnabledAtom = Atom.make((get) => {
  const preferences = get(mobilePreferencesAtom);
  return (
    AsyncResult.isSuccess(preferences) &&
    preferences.value.threadStarsEnabled === true &&
    get(threadStarsAvailableAtom)
  );
});

interface PendingStar {
  readonly color: ThreadStarColor | null;
}

const pendingStarsAtom = Atom.make<ReadonlyMap<string, PendingStar>>(new Map()).pipe(
  Atom.keepAlive,
);

function visibleThreadStar(
  thread: EnvironmentThreadShell,
  pending: ReadonlyMap<string, PendingStar>,
) {
  const update = pending.get(scopedThreadKey(thread.environmentId, thread.id));
  return update === undefined ? resolveThreadStar(thread.source) : update.color;
}

export function useThreadStars() {
  const gt = useGT();
  const enabled = useAtomValue(threadStarsEnabledAtom);
  const pendingStars = useAtomValue(pendingStarsAtom);
  const setStar = useAtomCommand(threadEnvironment.setStar, { reportFailure: false });
  const readStar = useCallback(
    (thread: EnvironmentThreadShell) => visibleThreadStar(thread, pendingStars),
    [pendingStars],
  );

  const cycleStar = async (thread: EnvironmentThreadShell) => {
    if (!appAtomRegistry.get(threadStarsEnabledAtom)) return;
    const { environmentId, id: threadId } = thread;
    const key = scopedThreadKey(environmentId, threadId);
    const live = appAtomRegistry.get(
      environmentThreadShells.threadShellAtom({ environmentId, threadId }),
    );
    if (live === null) return;
    const pending = new Map(appAtomRegistry.get(pendingStarsAtom));
    const update = { color: nextThreadStarColor(visibleThreadStar(live, pending)) };
    pending.set(key, update);
    appAtomRegistry.set(pendingStarsAtom, pending);

    const result = await setStar({
      environmentId,
      input: {
        type: "thread.star.set",
        commandId: CommandId.make(uuidv4()),
        threadId,
        color: update.color,
      },
    });
    if (appAtomRegistry.get(pendingStarsAtom).get(key) !== update) return;
    if (result._tag === "Success") {
      // Keep the optimistic color until the committed shell arrives.
      await Effect.runPromise(
        AtomRegistry.toStream(appAtomRegistry, environmentShell.stateValueAtom(environmentId)).pipe(
          Stream.filter(
            (shell) =>
              (Option.getOrNull(shell.snapshot)?.snapshotSequence ?? -1) >= result.value.sequence,
          ),
          Stream.runHead,
          Effect.timeoutOption(5_000),
        ),
      );
    } else {
      Dialog.alert(gt("Couldn't update thread star"), gt("Try again."));
    }
    appAtomRegistry.update(pendingStarsAtom, (current) => {
      if (current.get(key) !== update) return current;
      const next = new Map(current);
      next.delete(key);
      return next;
    });
  };

  return { enabled, readStar, cycleStar };
}
