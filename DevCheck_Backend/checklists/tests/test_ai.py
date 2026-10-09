"""AI checklist drafting and action plans. The real API is never called: tests patch
`checklists.ai` entry points, or its `_client`, with fakes."""

from types import SimpleNamespace

import pytest

from checklists import ai
from checklists.models import Page, Project, Task

DRAFT_URL = "/checklists/ai/draft/"
PLAN = {
    "steps": [{"title": "Scaffold the app", "detail": "Start with auth.", "stage": "MVP"}],
    "suggestions": [{"title": "Add teams", "detail": "Share projects."}],
}
DRAFT = {
    "pages": [{"name": "Login", "tasks": {"MVP": ["Add login form"], "DEV": [], "DEPLOY": []}}],
    "plan": {"steps": PLAN["steps"], "suggestions": []},
}


def plan_url(project):
    return f"/checklists/projects/{project.id}/ai-plan/"


def tree_url(project):
    return f"/checklists/projects/{project.id}/tree/"


@pytest.fixture
def project(user):
    return Project.objects.create(owner=user, name="P", description="d")


# --- draft endpoint ---------------------------------------------------------------------


def test_draft_returns_pages_and_plan_without_saving(api_client, monkeypatch):
    calls = []
    monkeypatch.setattr(
        ai, "draft_checklist", lambda *args: calls.append(args) or DRAFT, raising=True
    )
    res = api_client.post(
        DRAFT_URL,
        {"name": "Shop", "description": "A store", "pages": ["Login"]},
        format="json",
    )
    assert res.status_code == 200, res.data
    assert res.data["pages"][0]["name"] == "Login"
    assert res.data["plan"]["steps"][0]["stage"] == "MVP"
    assert calls == [("Shop", "A store", None, ["Login"])]
    assert Project.objects.count() == 0
    assert Page.objects.count() == 0


def test_draft_requires_a_name(api_client):
    res = api_client.post(DRAFT_URL, {"description": "x"}, format="json")
    assert res.status_code == 400
    assert "name" in res.data


def test_draft_requires_authentication(anon_client):
    res = anon_client.post(DRAFT_URL, {"name": "n", "description": "d"}, format="json")
    assert res.status_code == 401


def test_draft_rejects_model_output_over_the_task_limit(api_client, monkeypatch):
    too_long = {**DRAFT, "pages": [{"name": "Login", "tasks": {"MVP": ["x" * 201]}}]}
    monkeypatch.setattr(ai, "draft_checklist", lambda *args: too_long)
    res = api_client.post(DRAFT_URL, {"name": "n", "description": "d"}, format="json")
    assert res.status_code == 400


def test_draft_without_api_key_returns_503_with_detail(api_client, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    res = api_client.post(DRAFT_URL, {"name": "n", "description": "d"}, format="json")
    assert res.status_code == 503
    assert "ANTHROPIC_API_KEY" in res.data["detail"]


def test_draft_generation_error_returns_502(api_client, monkeypatch):
    def boom(*args):
        raise ai.AIGenerationError("The AI service failed.")

    monkeypatch.setattr(ai, "draft_checklist", boom)
    res = api_client.post(DRAFT_URL, {"name": "n", "description": "d"}, format="json")
    assert res.status_code == 502
    assert res.data["detail"] == "The AI service failed."


# --- plan endpoint ----------------------------------------------------------------------


def test_plan_is_saved_and_creates_no_tasks(api_client, project_tree, user, monkeypatch):
    project, *_ = project_tree(user)
    before = Task.objects.count()
    monkeypatch.setattr(ai, "plan_for_project", lambda p: PLAN)

    res = api_client.post(plan_url(project))
    assert res.status_code == 200, res.data
    assert res.data["steps"] == PLAN["steps"]
    assert res.data["suggestions"] == PLAN["suggestions"]
    assert res.data["model"] and res.data["generated_at"]

    project.refresh_from_db()
    assert project.ai_plan["steps"] == PLAN["steps"]
    assert Task.objects.count() == before


def test_plan_for_another_users_project_is_404(api_client, other_user, monkeypatch):
    theirs = Project.objects.create(owner=other_user, name="Theirs", description="d")
    monkeypatch.setattr(ai, "plan_for_project", lambda p: PLAN)
    assert api_client.post(plan_url(theirs)).status_code == 404
    theirs.refresh_from_db()
    assert theirs.ai_plan is None


def test_plan_unavailable_returns_503_and_keeps_the_old_plan(api_client, project, monkeypatch):
    project.ai_plan = {"steps": [], "suggestions": []}
    project.save()
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    res = api_client.post(plan_url(project))
    assert res.status_code == 503
    project.refresh_from_db()
    assert project.ai_plan == {"steps": [], "suggestions": []}


def test_delete_plan_clears_it_and_keeps_tasks(api_client, project_tree, user):
    project, *_ = project_tree(user)
    project.ai_plan = PLAN
    project.save()
    before = Task.objects.count()

    assert api_client.delete(plan_url(project)).status_code == 204

    project.refresh_from_db()
    assert project.ai_plan is None
    assert Task.objects.count() == before


def test_delete_plan_for_another_users_project_is_404(api_client, other_user):
    theirs = Project.objects.create(owner=other_user, name="Theirs", description="d", ai_plan=PLAN)
    assert api_client.delete(plan_url(theirs)).status_code == 404
    theirs.refresh_from_db()
    assert theirs.ai_plan == PLAN


def test_detail_includes_ai_plan(api_client, project):
    url = f"/checklists/projects/{project.id}/detail/"
    assert api_client.get(url).data["ai_plan"] is None
    project.ai_plan = PLAN
    project.save()
    assert api_client.get(url).data["ai_plan"] == PLAN


def test_detail_ignores_a_client_supplied_ai_plan(api_client, project):
    url = f"/checklists/projects/{project.id}/detail/"
    api_client.patch(url, {"ai_plan": PLAN}, format="json")
    project.refresh_from_db()
    assert project.ai_plan is None


# --- tree endpoint with a plan ----------------------------------------------------------


def test_tree_saves_the_plan_with_the_pages(api_client, project):
    payload = {
        "pages": [{"name": "Login", "tasks": {"MVP": ["Add form"]}}],
        "plan": {"steps": PLAN["steps"]},
    }
    res = api_client.post(tree_url(project), payload, format="json")
    assert res.status_code == 201, res.data
    project.refresh_from_db()
    assert project.ai_plan["steps"] == PLAN["steps"]
    assert project.ai_plan["suggestions"] == []
    assert project.ai_plan["generated_at"]
    assert Page.objects.filter(project=project).count() == 1


def test_tree_with_an_invalid_plan_creates_nothing(api_client, project):
    bad_step = {"title": "t", "detail": "d", "stage": "STAGING"}
    payload = {"pages": [{"name": "Login"}], "plan": {"steps": [bad_step]}}
    res = api_client.post(tree_url(project), payload, format="json")
    assert res.status_code == 400
    project.refresh_from_db()
    assert project.ai_plan is None
    assert Page.objects.filter(project=project).count() == 0


# --- ai module --------------------------------------------------------------------------


class FakeClient:
    """Stands in for anthropic.Anthropic; records the request and returns a canned reply."""

    def __init__(self, parsed=None, stop_reason="end_turn"):
        self.request = None
        reply = SimpleNamespace(parsed_output=parsed, stop_reason=stop_reason)

        def parse(**kwargs):
            self.request = kwargs
            return reply

        self.beta = SimpleNamespace(messages=SimpleNamespace(parse=parse))


def use_client(monkeypatch, client):
    monkeypatch.setattr(ai, "_client", lambda: client)
    return client


def test_plan_for_project_prompt_marks_done_and_open_tasks(
    project_tree, user, monkeypatch, settings
):
    project, _, _, tasks = project_tree(user, name="Shop")
    tasks["MVP"].completed = True
    tasks["MVP"].save()
    parsed = ai.ProjectPlan(
        steps=[ai.PlanStep(title="t", detail="d", stage="DEV")],
        suggestions=[ai.Suggestion(title="s", detail="d")],
    )
    client = use_client(monkeypatch, FakeClient(parsed))

    result = ai.plan_for_project(project)

    prompt = client.request["messages"][0]["content"]
    assert "Project: Shop" in prompt
    assert "[x] MVP task" in prompt
    assert "[ ] DEV task" in prompt
    assert client.request["model"] == settings.ANTHROPIC_MODEL
    assert client.request["output_format"] is ai.ProjectPlan
    assert result["steps"] == [{"title": "t", "detail": "d", "stage": "DEV"}]
    assert result["suggestions"] == [{"title": "s", "detail": "d"}]


def test_draft_checklist_maps_stages_and_honors_page_hints(monkeypatch):
    parsed = ai.ChecklistDraft(
        pages=[ai.DraftPage(name="Login", mvp=["a"], dev=["b"], deploy=["c"])],
        steps=[ai.PlanStep(title="t", detail="d", stage="MVP")],
    )
    client = use_client(monkeypatch, FakeClient(parsed))

    result = ai.draft_checklist("Shop", "A store", None, ["Login", "Cart"])

    assert "Login, Cart" in client.request["messages"][0]["content"]
    assert result["pages"] == [
        {"name": "Login", "tasks": {"MVP": ["a"], "DEV": ["b"], "DEPLOY": ["c"]}}
    ]
    assert result["plan"]["suggestions"] == []


def test_a_refusal_raises_instead_of_reading_output(monkeypatch):
    use_client(monkeypatch, FakeClient(parsed=None, stop_reason="refusal"))
    with pytest.raises(ai.AIGenerationError, match="declined"):
        ai.draft_checklist("n", "d")


def test_a_truncated_response_raises(monkeypatch):
    use_client(monkeypatch, FakeClient(parsed=None, stop_reason="max_tokens"))
    with pytest.raises(ai.AIGenerationError, match="incomplete"):
        ai.draft_checklist("n", "d")
