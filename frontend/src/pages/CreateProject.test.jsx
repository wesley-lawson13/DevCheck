import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import CreateProject from "./CreateProject";
import api from "../api";
import { API, server } from "../test/server";

function renderCreate(mode) {
  return render(
    <MemoryRouter initialEntries={["/create-project"]}>
      <Routes>
        <Route path="/create-project" element={<CreateProject mode={mode} />} />
        <Route
          path="/projects/:projectId"
          element={<div>Created project page</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillRequiredFields(
  user,
  { title = "My App", description = "Does things" } = {},
) {
  await user.type(screen.getByLabelText(/Project Title/), title);
  await user.type(screen.getByLabelText(/Project Description/), description);
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("CreateProject", () => {
  test("sends multipart FormData including the chosen image", async () => {
    const user = userEvent.setup();
    let form;
    let contentType;
    const post = vi.spyOn(api, "post");
    server.use(
      http.post(`${API}/checklists/projects/`, async ({ request }) => {
        contentType = request.headers.get("content-type");
        form = await request.formData();
        return HttpResponse.json({ id: 7 }, { status: 201 });
      }),
    );
    const { container } = renderCreate();
    await fillRequiredFields(user);
    await user.type(
      screen.getByLabelText(/Project URL/),
      "https://example.com",
    );
    const image = new File(["png-bytes"], "thumb.png", { type: "image/png" });
    await user.upload(container.querySelector('input[type="file"]'), image);
    expect(await screen.findByAltText("Thumbnail preview")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Project" }));

    expect(await screen.findByText("Created project page")).toBeInTheDocument();
    expect(contentType).toContain("multipart/form-data");
    expect(form.get("name")).toBe("My App");
    expect(form.get("description")).toBe("Does things");
    expect(form.get("link")).toBe("https://example.com");
    // jsdom's XHR hands msw an anonymous, empty blob (filename and bytes are lost in this
    // environment; a browser sends them), so on the wire we only check the image part exists
    // with its MIME type, and check the exact File at the api.post boundary.
    expect(form.get("image").type).toBe("image/png");
    const body = post.mock.calls[0][1];
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("image")).toBe(image);
  });

  test("the thumbnail is optional: no image and no link are omitted from the body", async () => {
    const user = userEvent.setup();
    let form;
    server.use(
      http.post(`${API}/checklists/projects/`, async ({ request }) => {
        form = await request.formData();
        return HttpResponse.json({ id: 8 }, { status: 201 });
      }),
    );
    renderCreate();
    await fillRequiredFields(user);

    await user.click(screen.getByRole("button", { name: "Create Project" }));

    expect(await screen.findByText("Created project page")).toBeInTheDocument();
    expect([...form.keys()].sort()).toEqual(["description", "name"]);
  });

  test("removing the chosen thumbnail stops it being sent", async () => {
    const user = userEvent.setup();
    let form;
    server.use(
      http.post(`${API}/checklists/projects/`, async ({ request }) => {
        form = await request.formData();
        return HttpResponse.json({ id: 9 }, { status: 201 });
      }),
    );
    const { container } = renderCreate();
    await fillRequiredFields(user);
    await user.upload(
      container.querySelector('input[type="file"]'),
      new File(["x"], "a.png", { type: "image/png" }),
    );
    await screen.findByAltText("Thumbnail preview");
    await user.click(
      screen
        .getByAltText("Thumbnail preview")
        .parentElement.querySelector("button"),
    );

    await user.click(screen.getByRole("button", { name: "Create Project" }));

    await screen.findByText("Created project page");
    expect(form.has("image")).toBe(false);
  });

  test("shows API validation errors under the fields and stays on the form", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API}/checklists/projects/`, () =>
        HttpResponse.json(
          {
            name: ["A project with that name is not allowed."],
            image: ["Upload an image file."],
          },
          { status: 400 },
        ),
      ),
    );
    renderCreate();
    await fillRequiredFields(user);

    await user.click(screen.getByRole("button", { name: "Create Project" }));

    expect(
      await screen.findByText("A project with that name is not allowed."),
    ).toBeInTheDocument();
    expect(screen.getByText("Upload an image file.")).toBeInTheDocument();
    expect(screen.queryByText("Created project page")).not.toBeInTheDocument();
  });

  test("queued pages are sent as a single tree request after the project is created (4.1, B8)", async () => {
    const user = userEvent.setup();
    const calls = [];
    server.use(
      http.post(`${API}/checklists/projects/`, () => {
        calls.push("project");
        return HttpResponse.json({ id: 7 }, { status: 201 });
      }),
      http.post(`${API}/checklists/projects/7/tree/`, async ({ request }) => {
        calls.push(["tree", await request.json()]);
        return HttpResponse.json([{ id: 70, name: "Landing", sections: [] }], {
          status: 201,
        });
      }),
    );
    renderCreate();
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "+ Add" }));
    await user.type(screen.getByPlaceholderText("Enter page name"), "Landing");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByText("Landing")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Project" }));

    await screen.findByText("Created project page");
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0]).toBe("project");
    expect(calls[1]).toEqual(["tree", { pages: [{ name: "Landing" }] }]);
  });

  describe("build with AI", () => {
    const DRAFT = {
      pages: [
        {
          name: "Login",
          tasks: {
            MVP: ["Add form", "Hash passwords"],
            DEV: [],
            DEPLOY: ["Set secret key"],
          },
        },
      ],
      plan: {
        steps: [
          { title: "Scaffold app", detail: "Start with auth.", stage: "MVP" },
        ],
        suggestions: [],
      },
    };
    const draftUrl = `${API}/checklists/ai/draft/`;

    test("manual mode has no project brief box", () => {
      renderCreate("manual");
      expect(screen.queryByLabelText(/Project Context/)).not.toBeInTheDocument();
    });

    test("generates a draft, lets you trim it, and saves pages, tasks and plan together", async () => {
      const user = userEvent.setup();
      const calls = [];
      server.use(
        http.post(draftUrl, async ({ request }) => {
          calls.push(["draft", await request.json()]);
          return HttpResponse.json(DRAFT);
        }),
        http.post(`${API}/checklists/projects/`, () => {
          calls.push("project");
          return HttpResponse.json({ id: 7 }, { status: 201 });
        }),
        http.post(`${API}/checklists/projects/7/tree/`, async ({ request }) => {
          calls.push(["tree", await request.json()]);
          return HttpResponse.json([], { status: 201 });
        }),
      );
      renderCreate("ai");
      await fillRequiredFields(user);

      await user.click(
        screen.getByRole("button", { name: "Generate checklist" }),
      );
      expect(await screen.findByText("Login")).toBeInTheDocument();
      expect(screen.getByText("Scaffold app")).toBeInTheDocument();
      expect(calls[0]).toEqual([
        "draft",
        { name: "My App", description: "Does things", pages: [] },
      ]);

      await user.click(
        screen.getByRole("button", { name: "Remove task Hash passwords" }),
      );
      expect(screen.queryByText("Hash passwords")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Create Project" }));

      await screen.findByText("Created project page");
      expect(calls[1]).toBe("project");
      expect(calls[2]).toEqual([
        "tree",
        {
          pages: [
            {
              name: "Login",
              tasks: {
                MVP: ["Add form"],
                DEV: [],
                DEPLOY: ["Set secret key"],
              },
            },
          ],
          plan: DRAFT.plan,
        },
      ]);
    });

    test("the project brief is sent with the draft request", async () => {
      const user = userEvent.setup();
      let body;
      server.use(
        http.post(draftUrl, async ({ request }) => {
          body = await request.json();
          return HttpResponse.json(DRAFT);
        }),
      );
      renderCreate("ai");
      await fillRequiredFields(user);
      await user.type(
        screen.getByLabelText(/Project Context/),
        "Use Django, avoid Redux",
      );
      await user.click(
        screen.getByRole("button", { name: "Generate checklist" }),
      );

      await screen.findByText("Scaffold app");
      expect(body.context).toBe("Use Django, avoid Redux");
    });

    test("page names typed beforehand are sent as hints", async () => {
      const user = userEvent.setup();
      let body;
      server.use(
        http.post(draftUrl, async ({ request }) => {
          body = await request.json();
          return HttpResponse.json(DRAFT);
        }),
      );
      renderCreate("ai");
      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: "+ Add" }));
      await user.type(screen.getByPlaceholderText("Enter page name"), "Login");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await user.click(
        screen.getByRole("button", { name: "Generate checklist" }),
      );

      await screen.findByText("Scaffold app");
      expect(body.pages).toEqual(["Login"]);
    });

    test("shows the server's message when generation fails", async () => {
      const user = userEvent.setup();
      server.use(
        http.post(draftUrl, () =>
          HttpResponse.json(
            {
              detail: "AI generation is not configured. Set ANTHROPIC_API_KEY.",
            },
            { status: 503 },
          ),
        ),
      );
      renderCreate("ai");
      await fillRequiredFields(user);

      await user.click(
        screen.getByRole("button", { name: "Generate checklist" }),
      );

      expect(await screen.findByText(/ANTHROPIC_API_KEY/)).toBeInTheDocument();
    });

    test("creating without a draft makes no request", async () => {
      const user = userEvent.setup();
      const post = vi.spyOn(api, "post");
      post.mockClear(); // spies from earlier tests are never restored
      renderCreate("ai");
      await fillRequiredFields(user);

      await user.click(screen.getByRole("button", { name: "Create Project" }));

      expect(
        await screen.findByText(/Generate a checklist first/),
      ).toBeInTheDocument();
      expect(post).not.toHaveBeenCalled();
    });
  });
});
