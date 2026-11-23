import type { EnvironmentId, SidebarProjectGroupingMode } from "@t3tools/contracts";
import { DEFAULT_SIDEBAR_PROJECT_SORT_ORDER } from "@t3tools/contracts";
import {
  nextThreadReadFilter,
  type ThreadReadFilter,
} from "@t3tools/client-runtime/state/thread-inbox";
import { RegistryContext, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import { createContext, createElement, useContext, useState, type PropsWithChildren } from "react";

import type { ThreadListFilters } from "../../persistence/mobile-preferences";
import { saveMobilePreferences } from "../../state/preferences";
import { useAtomCommand } from "../../state/use-atom-command";
import type { HomeProjectSortOrder } from "./homeThreadList";

export interface HomeListOptions {
  readonly selectedEnvironmentId: EnvironmentId | null;
  readonly selectedProjectKeys: readonly string[];
  readonly projectSortOrder: HomeProjectSortOrder;
  readonly readFilter: ThreadReadFilter;
  readonly starredFilter: boolean;
}

export interface ResolvedHomeListOptions extends HomeListOptions {
  readonly projectGroupingMode: SidebarProjectGroupingMode;
}

function defaultHomeListOptions(filters?: ThreadListFilters): HomeListOptions {
  return {
    selectedEnvironmentId: filters?.environmentId ?? null,
    selectedProjectKeys: filters?.projectKeys ?? (filters?.projectKey ? [filters.projectKey] : []),
    readFilter: "all",
    starredFilter: false,
    projectSortOrder:
      DEFAULT_SIDEBAR_PROJECT_SORT_ORDER === "manual"
        ? "updated_at"
        : DEFAULT_SIDEBAR_PROJECT_SORT_ORDER,
  };
}

type UpdateOptions = (update: (current: HomeListOptions) => Partial<HomeListOptions>) => void;

interface HomeListOptionsContextValue {
  readonly options: HomeListOptions;
  readonly updateOptions: UpdateOptions;
  readonly projectGroupingMode: SidebarProjectGroupingMode;
}

const HomeListOptionsContext = createContext<HomeListOptionsContextValue | null>(null);

export function HomeListOptionsProvider({
  children,
  projectGroupingMode,
  savedFilters,
}: PropsWithChildren<{
  readonly projectGroupingMode: SidebarProjectGroupingMode;
  readonly savedFilters?: ThreadListFilters | undefined;
}>) {
  const registry = useContext(RegistryContext);
  const [optionsAtom] = useState(() => Atom.make(defaultHomeListOptions(savedFilters)));
  const options = useAtomValue(optionsAtom);
  const savePreferences = useAtomCommand(saveMobilePreferences);
  // Only the scope persists; the sort order is per session. Updates read the
  // registry, so several in one event each build on the last and save it.
  const updateOptions: UpdateOptions = (update) => {
    const current = registry.get(optionsAtom);
    const next = { ...current, ...update(current) };
    registry.set(optionsAtom, next);
    if (
      next.selectedEnvironmentId !== current.selectedEnvironmentId ||
      next.selectedProjectKeys !== current.selectedProjectKeys
    ) {
      void savePreferences({
        threadListFilters: {
          environmentId: next.selectedEnvironmentId,
          projectKey: next.selectedProjectKeys[0] ?? null,
          ...(next.selectedProjectKeys.length > 1 ? { projectKeys: next.selectedProjectKeys } : {}),
        },
      });
    }
  };
  const value = { options, updateOptions, projectGroupingMode };
  return createElement(HomeListOptionsContext, { value }, children);
}

export function useHomeListOptions(
  availableEnvironmentIds: ReadonlySet<EnvironmentId>,
  multipleProjects = false,
) {
  const shared = useContext(HomeListOptionsContext);
  const [localOptions, setLocalOptions] = useState<HomeListOptions>(defaultHomeListOptions);
  const options = shared?.options ?? localOptions;
  const updateOptions: UpdateOptions =
    shared?.updateOptions ??
    ((update) => setLocalOptions((current) => ({ ...current, ...update(current) })));
  const selectedEnvironmentId =
    options.selectedEnvironmentId !== null &&
    availableEnvironmentIds.has(options.selectedEnvironmentId)
      ? options.selectedEnvironmentId
      : null;
  const availableOptions =
    selectedEnvironmentId === options.selectedEnvironmentId
      ? options
      : { ...options, selectedEnvironmentId };
  const resolvedOptions: ResolvedHomeListOptions = {
    ...availableOptions,
    selectedProjectKeys: multipleProjects
      ? options.selectedProjectKeys
      : options.selectedProjectKeys.slice(0, 1),
    projectGroupingMode: shared?.projectGroupingMode ?? "repository",
  };

  const setSelectedEnvironmentId = (value: EnvironmentId | null) => {
    updateOptions(() => ({ selectedEnvironmentId: value }));
  };
  const setSelectedProjectKey = (value: string | null, equivalentKeys: readonly string[] = []) => {
    updateOptions(({ selectedProjectKeys }) => {
      if (value === null) return { selectedProjectKeys: [] };
      if (!multipleProjects) return { selectedProjectKeys: [value] };
      const otherKeys = selectedProjectKeys.filter(
        (key) => key !== value && !equivalentKeys.includes(key),
      );
      return {
        selectedProjectKeys:
          otherKeys.length === selectedProjectKeys.length
            ? [...selectedProjectKeys, value]
            : otherKeys,
      };
    });
  };
  const setProjectSortOrder = (value: HomeProjectSortOrder) => {
    updateOptions(() => ({ projectSortOrder: value }));
  };
  return {
    options: resolvedOptions,
    setSelectedEnvironmentId,
    setSelectedProjectKey,
    setProjectSortOrder,
    toggleStarredFilter: () =>
      updateOptions(({ starredFilter }) => ({ starredFilter: !starredFilter })),
    cycleReadFilter: () =>
      updateOptions(({ readFilter }) => ({ readFilter: nextThreadReadFilter[readFilter] })),
  } as const;
}
