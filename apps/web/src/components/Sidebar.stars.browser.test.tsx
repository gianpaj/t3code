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
  dispatchedCommands,
  ENVIRONMENT_ID,
  rejectPendingCommand,
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

it("replaces pins with reversible thread stars and finds stars outside the initial shell", async () => {
  const projectId = ProjectId.make("other-project");
  const at = "2026-03-17T19:12:28.000Z";
  const review = {
    ...threadWithHistory("review", 1),
    starColor: "green",
    lastVisitedAt: DateTime.makeUnsafe("2026-03-17T19:00:00.000Z"),
    pullRequests: [
      {
        host: "github.com",
        repository: "example/repo",
        number: 41,
        url: "https://github.com/example/repo/pull/41",
        source: "manual",
        linkedAt: at,
        stack: null,
        snapshot: {
          state: "open",
          title: "Review",
          headBranch: "review",
          baseBranch: "main",
          isDraft: true,
          updatedAt: at,
          syncedAt: at,
        },
      } satisfies ThreadPullRequestLink,
    ],
  } as const;
  const read = { ...threadWithHistory("read-star", 1), projectId, starColor: "yellow" } as const;
  const ordinary = threadWithHistory("ordinary", 1);
  const pin = {
    ...threadWithHistory("legacy-pin-1", 1),
    pinnedAt: DateTime.makeUnsafe(at),
    pinOrderKey: "a0",
  };
  const otherPin = {
    ...threadWithHistory("legacy-pin-2", 1),
    pinnedAt: DateTime.makeUnsafe(at),
    pinOrderKey: "a1",
    starColor: "blue",
  } as const;
  const history = {
    ...threadWithHistory("zz-older-star", 1),
    projectId,
    olderSettled: true,
    starColor: "blue",
  } as const;
  const rejected = threadWithHistory("reject-star", 1);
  using _environment = installFakeEnvironment(
    [
      review,
      read,
      ordinary,
      otherPin,
      pin,
      rejected,
      ...Array.from({ length: 30 }, (_, index) => ({
        ...threadWithHistory(`older-unstarred-${index}`, 1),
        projectId,
        olderSettled: true as const,
      })),
      history,
    ],
    {
      threadStars: true,
      serveOlderSettled: true,
      acceptCommands: true,
      extraProjects: [{ id: projectId, title: "Other project" }],
      holdCommand: (command) =>
        command.type === "thread.star.set" && command.threadId === rejected.id,
    },
  );
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    priorityInboxEnabled: true,
    threadStarsEnabled: false,
    sidebarProjectSortOrder: "manual",
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  using _settings = {
    [Symbol.dispose]: () => __setClientSettingsForTests(DEFAULT_CLIENT_SETTINGS),
  };
  await page.viewport(1400, 900);
  const threadPath = `/${ENVIRONMENT_ID}/${review.id}`;
  const router = getRouter(createMemoryHistory({ initialEntries: [threadPath] }));
  await router.load();
  await using screen = await render(<AppRoot router={router} />, {
    // AppRoot brings its own router.
    router: false,
  });

  const rowOf = ({ id }: { id: string }) =>
    screen.getByTestId("sidebar-row-card").filter({ hasText: id });
  const ordinaryRow = rowOf(ordinary);
  const reviewRow = rowOf(review);
  const rejectRow = rowOf(rejected);
  const starred = screen.getByRole("button", { name: "Starred", exact: true });
  const readFilter = screen.getByRole("button", { name: /^Read filter:/ });
  const settled = screen.getByRole("button", { name: /^Settled/ });
  const starsFor = (threadId: typeof ordinary.id) =>
    dispatchedCommands().flatMap((command) =>
      command.type === "thread.star.set" && command.threadId === threadId ? [command.color] : [],
    );
  const labs = () => router.navigate({ to: "/settings/labs" });
  const prioritySwitch = page.getByRole("switch", { name: "Priority inbox" });
  const starsSwitch = page.getByRole("switch", { name: "Thread stars" });
  const starredShelf = screen.getByRole("heading", { name: "Starred", exact: true });
  const pinRow = rowOf(pin);
  const otherPinRow = rowOf(otherPin);
  const unpin = (row: typeof pinRow) => row.getByRole("button", { name: "Unpin thread" });
  const expectPinOrder = () => {
    expect(
      pinRow.element().compareDocumentPosition(otherPinRow.element()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  };

  await expect.element(ordinaryRow).toBeVisible();
  await expect.element(reviewRow).toHaveAttribute("data-sidebar-parent", "shelf:priority");
  await expect.element(ordinaryRow).toHaveAttribute("data-sidebar-parent", "shelf:other");
  await expect.element(unpin(pinRow)).toBeInTheDocument();
  expectPinOrder();
  await labs();
  await userEvent.click(starsSwitch);
  await router.navigate({ href: threadPath });
  await expect.element(starredShelf).toBeVisible();
  await expect.element(unpin(pinRow)).not.toBeInTheDocument();
  expectPinOrder();
  await userEvent.click(screen.getByRole("button", { name: `Thread actions for ${review.title}` }));
  await expect
    .element(page.getByRole("menuitem", { name: "Green star. Change to yellow" }))
    .toBeVisible();
  await expect.element(page.getByRole("menuitem", { name: "Pin thread" })).not.toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  for (const name of [
    "Green star. Change to yellow",
    "Yellow star. Change to blue",
    "Blue star. Remove star",
  ]) {
    await userEvent.click(pinRow.getByRole("button", { name }));
  }
  await expect.element(pinRow.getByRole("button", { name: "Add green star" })).toBeInTheDocument();
  await expect.element(pinRow).toHaveAttribute("data-sidebar-parent", "shelf:other");
  await expect
    .element(otherPinRow.getByRole("button", { name: "Blue star. Remove star" }))
    .toBeVisible();
  await vi.waitFor(() => expect(starsFor(pin.id)).toEqual(["yellow", "blue", null]));
  await userEvent.hover(ordinaryRow);
  const add = ordinaryRow.getByRole("button", { name: "Add green star" });
  await expect.element(add).toHaveStyle({ opacity: "1" });
  const snooze = ordinaryRow.getByRole("button", { name: "Snooze thread" });
  await expect.element(snooze).toBeVisible();
  expect(add.element().getBoundingClientRect().right).toBeLessThanOrEqual(
    snooze.element().getBoundingClientRect().left,
  );
  await userEvent.click(add);
  await userEvent.hover(starred);
  const green = ordinaryRow.getByRole("button", { name: "Green star. Change to yellow" });
  await expect.element(green).toHaveStyle({ opacity: "1" });
  await userEvent.click(green);
  await userEvent.click(ordinaryRow, { button: "right" });
  await expect.element(page.getByRole("menuitem", { name: "Mark unread" })).toBeVisible();
  await userEvent.click(page.getByRole("menuitem", { name: "Yellow star. Change to blue" }));
  await expect
    .element(ordinaryRow.getByRole("button", { name: "Blue star. Remove star" }))
    .toBeVisible();
  await vi.waitFor(() => expect(starsFor(ordinary.id)).toEqual(["green", "yellow", "blue"]));
  await expect.element(ordinaryRow).not.toHaveAttribute("data-sidebar-parent", "shelf:other");
  expect(
    otherPinRow.element().compareDocumentPosition(ordinaryRow.element()) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  await userEvent.hover(rejectRow);
  await userEvent.click(rejectRow.getByRole("button", { name: "Add green star" }));
  await expect
    .element(rejectRow.getByRole("button", { name: "Green star. Change to yellow" }))
    .toBeVisible();
  await vi.waitFor(() => expect(starsFor(rejected.id)).toEqual(["green"]));
  await rejectPendingCommand("Star rejected");
  await expect
    .element(rejectRow.getByRole("button", { name: "Add green star" }))
    .toBeInTheDocument();

  await userEvent.click(starred);
  await expect.element(starred).toHaveAttribute("aria-pressed", "true");
  await expect.element(reviewRow).toBeVisible();
  await expect.element(ordinaryRow).toBeVisible();
  await expect.element(rowOf(read)).toBeVisible();
  await expect.element(rejectRow).not.toBeInTheDocument();
  await expect.element(settled).toHaveTextContent("Settled1");
  await userEvent.click(settled);
  const older = screen.getByTestId("sidebar-row-slim").filter({ hasText: history.title });
  await expect.element(older).toBeVisible();
  await expect.element(older.getByRole("button", { name: "Blue star. Remove star" })).toBeVisible();

  await userEvent.click(screen.getByRole("button", { name: "Other project", exact: true }));
  await expect.element(older).toBeVisible();
  await expect.element(ordinaryRow).not.toBeInTheDocument();
  await expect.element(rowOf(read)).toBeVisible();
  await userEvent.click(readFilter);
  await expect.element(rowOf(read)).not.toBeInTheDocument();
  await expect.element(older).not.toBeInTheDocument();
  await userEvent.click(readFilter);
  await expect.element(rowOf(read)).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Other project", exact: true }));

  const clear = ordinaryRow.getByRole("button", { name: "Blue star. Remove star" });
  await userEvent.click(clear);
  await expect.element(ordinaryRow).not.toBeInTheDocument();
  await expect.element(starred).toHaveFocus();
  await vi.waitFor(() => expect(starsFor(ordinary.id)).toEqual(["green", "yellow", "blue", null]));
  await userEvent.click(starred);
  await expect
    .element(ordinaryRow.getByRole("button", { name: "Add green star" }))
    .toBeInTheDocument();

  await userEvent.click(starred);
  await router.navigate({ to: "/settings/labs" });
  await expect.element(prioritySwitch).toBeChecked();
  await expect.element(starsSwitch).toBeChecked();
  await userEvent.click(prioritySwitch);
  await expect.element(starsSwitch).toBeChecked();
  await router.navigate({ href: threadPath });

  await expect.element(readFilter).not.toBeInTheDocument();
  await expect.element(starred).toHaveAttribute("aria-pressed", "true");
  await expect.element(ordinaryRow).not.toBeInTheDocument();
  const yellow = rowOf(read).getByRole("button", { name: "Yellow star. Change to blue" });
  await expect.element(yellow).toBeVisible();

  await router.navigate({ to: "/settings/labs" });
  await userEvent.click(starsSwitch);
  await expect.element(starsSwitch).not.toBeChecked();
  await router.navigate({ href: threadPath });
  await expect.element(starred).not.toBeInTheDocument();
  await expect.element(yellow).not.toBeInTheDocument();
  await expect.element(ordinaryRow).toBeVisible();
  await expect.element(unpin(pinRow)).toBeInTheDocument();
  await expect.element(unpin(otherPinRow)).toBeInTheDocument();
  expectPinOrder();

  await router.navigate({ to: "/settings/labs" });
  await userEvent.click(starsSwitch);
  await expect.element(prioritySwitch).not.toBeChecked();
  await router.navigate({ href: threadPath });
  await expect.element(starred).toBeVisible();
  await expect.element(yellow).toBeVisible();
  await expect.element(pinRow).not.toBeInTheDocument();
  await expect.element(otherPinRow).toBeVisible();
});
