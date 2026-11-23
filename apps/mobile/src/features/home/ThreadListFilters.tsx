import { useState } from "react";
import { useGT } from "gt-react-native";
import { Pressable, ScrollView, View } from "react-native";
import {
  nextThreadReadFilter,
  type ThreadReadFilter,
} from "@t3tools/client-runtime/state/thread-inbox";
import { Chip } from "../../components/ui/Chip";
import { SymbolView } from "../../components/ui/AppSymbol";
import { ThreadProjectFilterSheet } from "./ThreadProjectFilterSheet";
import { ListFilterMenu } from "../layout/workspace/ListFilterMenu";
import type { EnvironmentId } from "@t3tools/contracts";
import type {
  HomeListFilterMenuEnvironment,
  HomeListFilterMenuProject,
} from "./home-list-filter-menu";

export function ThreadListFilters(props: {
  readonly environments: ReadonlyArray<HomeListFilterMenuEnvironment>;
  readonly projects: ReadonlyArray<HomeListFilterMenuProject>;
  readonly selectedEnvironmentId: EnvironmentId | null;
  readonly selectedProjectKeys: readonly string[];
  readonly onEnvironmentChange: (environmentId: EnvironmentId | null) => void;
  readonly onProjectChange: (projectKey: string | null) => void;
  readonly readFilter?: ThreadReadFilter | undefined;
  readonly onCycleReadFilter?: (() => void) | undefined;
  readonly starredOnly?: boolean | undefined;
  readonly onToggleStarredFilter?: (() => void) | undefined;
  /** List padding the scroller bleeds through so pills start where row content does. */
  readonly gutter: number;
}) {
  const gt = useGT();
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const selectedEnvironment = props.environments.find(
    (environment) => environment.environmentId === props.selectedEnvironmentId,
  );
  const hasProjectFilter = props.selectedProjectKeys.length > 0;
  const selectedProject = props.projects.find((project) =>
    props.selectedProjectKeys.includes(project.key),
  );
  const projectPicker = (
    <ListFilterMenu
      label={selectedProject?.label ?? gt("All projects")}
      accessibilityLabel={gt("Filter threads by project")}
      active={hasProjectFilter}
      actions={[
        { id: "all", title: gt("All projects"), state: hasProjectFilter ? "off" : "on" },
        ...props.projects.map((project) => ({
          id: JSON.stringify(project.key),
          title: project.label,
          state: props.selectedProjectKeys.includes(project.key)
            ? ("on" as const)
            : ("off" as const),
        })),
      ]}
      onSelect={(id) => {
        if (id === "all") props.onProjectChange(null);
        else {
          const project = props.projects.find((candidate) => JSON.stringify(candidate.key) === id);
          if (project) props.onProjectChange(project.key);
        }
      }}
    />
  );
  const readLabels = {
    all: gt("All", { $context: "thread read filter" }),
    unread: gt("Unread", { $context: "thread read filter" }),
    read: gt("Read", { $context: "thread read filter" }),
  };
  const starFilter = props.onToggleStarredFilter ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={gt("Starred")}
      accessibilityState={{ selected: props.starredOnly === true }}
      className="h-8 w-8 items-center justify-center rounded-full bg-subtle active:opacity-70"
      hitSlop={6}
      onPress={props.onToggleStarredFilter}
    >
      <SymbolView
        name={props.starredOnly ? "star.fill" : "star"}
        size={16}
        tintColorClassName="accent-icon-muted"
      />
    </Pressable>
  ) : null;
  const readFilter = props.readFilter;
  if (readFilter !== undefined) {
    return (
      <View className="flex-row items-start gap-2 px-2 pb-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={gt("Read filter: {current}. Switch to {next}.", {
            current: readLabels[readFilter],
            next: readLabels[nextThreadReadFilter[readFilter]],
          })}
          onPress={props.onCycleReadFilter}
        >
          <Chip label={readLabels[readFilter]} selected={readFilter !== "all"} />
        </Pressable>
        {starFilter}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {props.projects.slice(0, 3).map((project) => {
            const selected = props.selectedProjectKeys.includes(project.key);
            return (
              <Pressable
                key={project.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className="max-w-32"
                onPress={() => props.onProjectChange(project.key)}
              >
                <Chip label={project.label} selected={selected} />
              </Pressable>
            );
          })}
        </ScrollView>
        {props.projects.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={gt("Filter threads by project")}
            accessibilityState={{ selected: hasProjectFilter, expanded: projectPickerOpen }}
            className="h-8 w-8 items-center justify-center rounded-full bg-subtle active:opacity-70"
            hitSlop={6}
            onPress={() => setProjectPickerOpen(true)}
          >
            <SymbolView
              name={
                hasProjectFilter
                  ? "line.3.horizontal.decrease.circle.fill"
                  : "line.3.horizontal.decrease"
              }
              size={16}
              tintColorClassName="accent-icon-muted"
            />
          </Pressable>
        ) : null}
        {projectPickerOpen ? (
          <ThreadProjectFilterSheet
            projects={props.projects}
            selectedProjectKeys={props.selectedProjectKeys}
            onProjectChange={props.onProjectChange}
            onClose={() => setProjectPickerOpen(false)}
          />
        ) : null}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -props.gutter, overflow: "visible" }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 10, gap: 8 }}
    >
      {starFilter}
      <ListFilterMenu
        label={selectedEnvironment?.label ?? gt("All environments")}
        accessibilityLabel={gt("Filter threads by environment")}
        active={selectedEnvironment !== undefined}
        actions={[
          {
            id: "all",
            title: gt("All environments"),
            state: props.selectedEnvironmentId === null ? "on" : "off",
          },
          ...props.environments.map((environment) => ({
            id: JSON.stringify(environment.environmentId),
            title: environment.label,
            state:
              environment.environmentId === props.selectedEnvironmentId
                ? ("on" as const)
                : ("off" as const),
          })),
        ]}
        onSelect={(id) => {
          if (id === "all") props.onEnvironmentChange(null);
          else {
            const environment = props.environments.find(
              (candidate) => JSON.stringify(candidate.environmentId) === id,
            );
            if (environment) props.onEnvironmentChange(environment.environmentId);
          }
        }}
      />
      {projectPicker}
      {props.selectedEnvironmentId !== null || hasProjectFilter ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={gt("Reset thread filters")}
          className="h-8 w-8 items-center justify-center"
          onPress={() => {
            props.onEnvironmentChange(null);
            props.onProjectChange(null);
          }}
        >
          <SymbolView name="xmark.circle.fill" size={18} tintColorClassName="accent-icon-muted" />
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
