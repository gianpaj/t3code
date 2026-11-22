import { createMemoryHistory } from "@tanstack/react-router";
import { ProjectId, type ThreadPullRequestLink } from "@t3tools/contracts";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import type * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { AppRoot } from "~/AppRoot";
// The thread route loads ChatView lazily; its first transform would eat the test's timeout.
import "~/components/ChatView";
import "~/components/settings/LabsSettingsPanel";
import { __setClientSettingsForTests } from "~/hooks/useSettings";
import "~/index.css";
import { getRouter } from "~/router";
import {
  ENVIRONMENT_ID,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
} from "../../test/fakeEnvironment";
import { render } from "../../test/render";

// The socket is the only fake layer; see test/appScenarios.renders.tsx.
vi.mock("../../../../packages/client-runtime/src/connection/driver.ts", async (importOriginal) => {
  const [actual, { fakeDriver }, Layer] = await Promise.all([
    importOriginal<{ readonly ConnectionDriver: Context.Key<unknown, FakeDriver> }>(),
    import("../../test/fakeEnvironment"),
    import("effect/Layer"),
  ]);
  return { ...actual, layer: Layer.succeed(actual.ConnectionDriver, fakeDriver) };
});

vi.mock(import("~/rpc/requestLatencyState"), async (original) => ({
  ...(await original()),
  trackRpcRequestSent: () => {},
}));

it("gates the Priority inbox and its filters behind the Labs switch", async () => {
  const projects = ["Alpha", "Build", "Docs"].map((title) => ({
    title,
    id: ProjectId.make(title.toLowerCase()),
  }));
  const at = "2026-03-17T19:12:28.000Z";
  const priority = (name: string, number: number, unread: boolean, projectId?: ProjectId) => {
    const pullRequest: ThreadPullRequestLink = {
      host: "github.com",
      repository: "example/repo",
      number,
      url: `https://github.com/example/repo/pull/${number}`,
      source: "manual",
      linkedAt: at,
      stack: null,
      snapshot: {
        state: "open",
        title: name,
        headBranch: name,
        baseBranch: "main",
        isDraft: true,
        updatedAt: at,
        syncedAt: at,
      },
    };
    return {
      ...threadWithHistory(name, 1),
      ...(projectId === undefined ? {} : { projectId }),
      pullRequests: [pullRequest],
      lastVisitedAt: DateTime.makeUnsafe(unread ? "2026-03-17T19:00:00.000Z" : at),
    };
  };
  const ordinary = threadWithHistory("ordinary", 1);
  using _environment = installFakeEnvironment(
    [
      ordinary,
      ...Array.from({ length: 6 }, (_, index) => priority(`unread-${index}`, index + 1, true)),
      priority("read", 7, false),
      priority("docs-one", 8, true, projects[2]!.id),
      priority("docs-two", 9, true, projects[2]!.id),
    ],
    { extraProjects: projects },
  );
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    sidebarProjectSortOrder: "manual",
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  using _settings = {
    [Symbol.dispose]: () => __setClientSettingsForTests(DEFAULT_CLIENT_SETTINGS),
  };
  await page.viewport(1400, 900);
  const threadPath = `/${ENVIRONMENT_ID}/${ordinary.id}` as const;
  const router = getRouter(createMemoryHistory({ initialEntries: [threadPath] }));
  await router.load();
  await using screen = await render(<AppRoot router={router} />, {
    // AppRoot brings its own router.
    router: false,
  });

  const priorityHeader = screen.getByTestId("sidebar-priority-shelf-toggle");
  const otherHeader = screen.getByTestId("sidebar-other-shelf-toggle");
  const renderProject = screen.getByRole("button", { name: "render", exact: true });
  const readFilter = screen.getByRole("button", { name: /^Read filter:/ });
  const starredFilter = screen.getByRole("button", { name: "Starred", exact: true });
  const picker = screen.getByRole("combobox", { name: /^Filter threads by project/ });
  const labsSwitch = page.getByRole("switch", { name: "Priority inbox" });
  const activeRows = () => screen.container.querySelectorAll('[data-testid="sidebar-row-card"]');
  const priorityRows = () =>
    screen.container.querySelectorAll(
      '[data-testid="sidebar-row-card"][data-sidebar-parent="shelf:priority"]',
    );
  const expectPriority = async (count: number, visible: number) => {
    await expect.element(priorityHeader).toHaveTextContent(`Priority${count}`);
    await vi.waitFor(() => expect(priorityRows()).toHaveLength(visible));
  };

  await expect.element(picker).toBeVisible();
  await vi.waitFor(() => expect(activeRows()).toHaveLength(10));
  await expect.element(readFilter).not.toBeInTheDocument();
  await expect.element(starredFilter).not.toBeInTheDocument();
  await expect.element(renderProject).not.toBeInTheDocument();
  await expect.element(priorityHeader).not.toBeInTheDocument();

  await router.navigate({ to: "/settings/labs" });
  await expect.element(labsSwitch).not.toBeChecked();
  await userEvent.click(labsSwitch);
  await expect.element(labsSwitch).toBeChecked();
  await router.navigate({ href: threadPath });

  await expect.element(starredFilter).toBeVisible();
  await expectPriority(9, 5);
  await expect.element(otherHeader).toHaveTextContent("Everything else1");
  await userEvent.click(renderProject);
  await expect.element(renderProject).toHaveAttribute("aria-pressed", "true");
  await expect.element(screen.getByRole("button", { name: "Alpha", exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Build", exact: true })).toBeVisible();
  await expectPriority(7, 5);

  await userEvent.click(readFilter);
  await expect.element(readFilter).toHaveTextContent("Unread");
  await expect.element(otherHeader).not.toBeInTheDocument();
  await expectPriority(6, 5);
  await userEvent.click(screen.getByRole("button", { name: "Show 1 more", exact: true }));
  await expectPriority(6, 6);

  await userEvent.click(picker);
  const projectSearch = page.getByRole("combobox", { name: "Search projects" });
  await userEvent.fill(projectSearch, "docs");
  const docsProject = page.getByRole("option", { name: /^Docs/ });
  await userEvent.click(docsProject);
  await expect.element(docsProject).toHaveAttribute("aria-selected", "true");
  await expectPriority(8, 5);
  await userEvent.keyboard("{Escape}");

  await userEvent.click(readFilter);
  await expect.element(readFilter).toHaveTextContent("Read");
  await expectPriority(1, 1);
  await expect.element(otherHeader).toHaveTextContent("Everything else1");
  await userEvent.click(renderProject);
  await expect.element(renderProject).toHaveAttribute("aria-pressed", "false");
  await expect.element(priorityHeader).not.toBeInTheDocument();
  await expect.element(screen.getByText("No matching threads.")).toBeVisible();
  await userEvent.click(readFilter);
  await expect.element(readFilter).toHaveTextContent("All");
  await expectPriority(2, 2);

  await userEvent.click(picker);
  await userEvent.click(page.getByRole("option", { name: "All projects" }));
  await expectPriority(9, 5);
  await userEvent.keyboard("{Escape}");
  await userEvent.click(priorityHeader);
  await expect.element(priorityHeader).toHaveAttribute("aria-expanded", "false");
  await expectPriority(9, 0);
  await userEvent.click(priorityHeader);
  await expectPriority(9, 5);

  await userEvent.click(readFilter);
  await expectPriority(8, 5);
  await router.navigate({ to: "/settings/labs" });
  await expect.element(labsSwitch).toBeChecked();
  await userEvent.click(labsSwitch);
  await expect.element(labsSwitch).not.toBeChecked();
  await router.navigate({ href: threadPath });
  await expect.element(picker).toBeVisible();
  await expect.element(readFilter).not.toBeInTheDocument();
  await expect.element(starredFilter).not.toBeInTheDocument();
  await expect.element(priorityHeader).not.toBeInTheDocument();
  await vi.waitFor(() => expect(activeRows()).toHaveLength(10));
});
