import { createMemoryHistory } from "@tanstack/react-router";
import { ProjectId } from "@t3tools/contracts";
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
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
} from "../../test/fakeEnvironment";
import { act, render } from "../../test/render";

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

it("reorders a filtered Starred shelf and restores the saved pin order", async () => {
  const otherProject = ProjectId.make("another-project");
  const pinnedAt = DateTime.makeUnsafe("2026-03-17T19:12:28.000Z");
  const first = { ...threadWithHistory("first-pin", 1), pinnedAt, pinOrderKey: "a0" };
  const hidden = {
    ...threadWithHistory("hidden-pin", 1),
    projectId: otherProject,
    pinnedAt,
    pinOrderKey: "a1",
  };
  const second = { ...threadWithHistory("second-pin", 1), pinnedAt, pinOrderKey: "a2" };
  const yellow = {
    ...threadWithHistory("yellow-star", 1),
    projectId: otherProject,
    pinnedAt,
    pinOrderKey: "a3",
    starColor: "yellow",
  } as const;
  const blue = { ...threadWithHistory("blue-star", 1), starColor: "blue" } as const;
  const active = threadWithHistory("unstarred", 1);
  using _environment = installFakeEnvironment([first, hidden, second, yellow, blue, active], {
    threadStars: true,
    acceptCommands: true,
    extraProjects: [{ id: otherProject, title: "Other project" }],
  });
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    priorityInboxEnabled: true,
    threadStarsEnabled: true,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  using _settings = {
    [Symbol.dispose]: () => __setClientSettingsForTests(DEFAULT_CLIENT_SETTINGS),
  };
  await page.viewport(1400, 900);
  const threadPath = `/${ENVIRONMENT_ID}/${first.id}`;
  const router = getRouter(createMemoryHistory({ initialEntries: [threadPath] }));
  await router.load();
  await using screen = await render(<AppRoot router={router} />, {
    // AppRoot brings its own router.
    router: false,
  });

  const rowOf = (thread: { title: string }) =>
    screen.getByTestId("sidebar-row-card").filter({ hasText: thread.title });
  const project = screen.getByRole("button", { name: "render", exact: true });
  const orderedCards = () =>
    screen
      .getByTestId("sidebar-row-card")
      .elements()
      .map((row) => row.getAttribute("data-sidebar-row"));
  const keysOf = (threads: readonly { id: string }[]) =>
    threads.map((thread) => `${ENVIRONMENT_ID}:${thread.id}`);
  const drag = async (from: { title: string }, to: { title: string }) => {
    const row = rowOf(from).element();
    const target = rowOf(to).element();
    await vi.waitFor(() => {
      for (const card of [row, target]) {
        const item = card.closest("[data-thread-item]")!;
        expect(getComputedStyle(item).transform).toBe("none");
      }
    });
    const source = row.getBoundingClientRect();
    const destination = target.getBoundingClientRect();
    const x = source.left + source.width / 2;
    const y = source.top + source.height / 2;
    const targetY = destination.top + destination.height / 2;
    const pointer = (type: string, clientY: number) =>
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        isPrimary: true,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        clientX: x,
        clientY,
      });
    await act(() => {
      row.dispatchEvent(pointer("pointerdown", y));
      document.dispatchEvent(pointer("pointermove", y + Math.sign(targetY - y) * 10));
    });
    await act(() => document.dispatchEvent(pointer("pointermove", targetY)));
    await act(() => document.dispatchEvent(pointer("pointerup", targetY)));
  };

  await expect.element(rowOf(hidden)).toBeVisible();
  await userEvent.click(project);
  await expect.element(rowOf(hidden)).not.toBeInTheDocument();
  await expect.element(rowOf(yellow)).not.toBeInTheDocument();
  await expect.element(rowOf(second)).toBeVisible();
  await drag(second, first);
  await vi.waitFor(() =>
    expect(dispatchedCommands()).toContainEqual(
      expect.objectContaining({ type: "thread.star.reorder", threadId: second.id }),
    ),
  );
  await userEvent.click(project);
  await vi.waitFor(() =>
    expect(orderedCards().slice(0, 5)).toEqual(keysOf([second, first, hidden, yellow, blue])),
  );

  const toggleStars = async () => {
    await router.navigate({ to: "/settings/labs" });
    await userEvent.click(page.getByRole("switch", { name: "Thread stars" }));
    await router.navigate({ href: threadPath });
  };
  await toggleStars();
  await vi.waitFor(() =>
    expect(orderedCards().slice(0, 4)).toEqual(keysOf([first, hidden, second, yellow])),
  );
  await toggleStars();
  await vi.waitFor(() =>
    expect(orderedCards().slice(0, 5)).toEqual(keysOf([second, first, hidden, yellow, blue])),
  );
  await drag(blue, second);
  await vi.waitFor(() =>
    expect(dispatchedCommands()).toContainEqual(
      expect.objectContaining({ type: "thread.star.reorder", threadId: blue.id }),
    ),
  );
  await vi.waitFor(() =>
    expect(orderedCards().slice(0, 5)).toEqual(keysOf([blue, second, first, hidden, yellow])),
  );
  expect(dispatchedCommands().filter(({ type }) => type.startsWith("thread.pin"))).toEqual([]);
});
