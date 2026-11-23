import { foldSearchQuery } from "@t3tools/shared/paletteSearch";
import { useGT } from "gt-react-native";
import { useRef, useState } from "react";
import { type TextInputInstance, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SymbolView } from "../../components/ui/AppSymbol";
import { AppText } from "../../components/ui/AppText";
import { NavigationRow } from "../../components/ui/NavigationRow";
import { ScreenScrollView } from "../../components/ui/ScreenScrollView";
import { SearchField } from "../../components/ui/SearchField";
import { Sheet } from "../../components/ui/Sheet";
import type { HomeListFilterMenuProject } from "./home-list-filter-menu";

export function ThreadProjectFilterSheet(props: {
  readonly projects: readonly HomeListFilterMenuProject[];
  readonly selectedProjectKeys: readonly string[];
  readonly onProjectChange: (projectKey: string | null) => void;
  readonly onClose: () => void;
}) {
  const gt = useGT();
  const { bottom } = useSafeAreaInsets();
  const searchRef = useRef<TextInputInstance>(null);
  const [search, setSearch] = useState("");
  const query = foldSearchQuery(search);
  const projects = query
    ? props.projects.filter((project) => foldSearchQuery(project.label).includes(query))
    : props.projects;
  const projectRow = (key: string | null, title: string, selected: boolean) => (
    <NavigationRow
      key={key ?? "all"}
      title={title}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => props.onProjectChange(key)}
      trailing={
        selected ? (
          <SymbolView name="checkmark" size={16} tintColorClassName="accent-primary" />
        ) : null
      }
    />
  );

  return (
    <Sheet title={gt("Filter threads by project")} onClose={props.onClose}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(20, bottom),
        }}
      >
        <View className="flex-row">
          <SearchField
            inputRef={searchRef}
            autoFocus={false}
            accessibilityLabel={gt("Search projects")}
            clearAccessibilityLabel={gt("Clear search")}
            placeholder={gt("Search projects")}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View className="overflow-hidden rounded-2xl">
          {projectRow(null, gt("All projects"), props.selectedProjectKeys.length === 0)}
          {projects.map((project) =>
            projectRow(project.key, project.label, props.selectedProjectKeys.includes(project.key)),
          )}
        </View>
        {projects.length === 0 ? (
          <AppText className="text-center text-sm text-foreground-muted">
            {gt("No projects found")}
          </AppText>
        ) : null}
      </ScreenScrollView>
    </Sheet>
  );
}
