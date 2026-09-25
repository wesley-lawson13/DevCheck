"""POST /checklists/projects/<id>/tree/: atomic multi-page/section/task creation (4.1, B8)."""

import pytest

from checklists.models import ChecklistSection, Page, Project, Task


def tree_url(project):
    return f"/checklists/projects/{project.id}/tree/"


def test_tree_creates_pages_sections_and_tasks(api_client, user):
    project = Project.objects.create(owner=user, name="P", description="d")
    payload = {
        "pages": [
            {
                "name": "Landing",
                "tasks": {"MVP": ["Write copy", "Add hero image"], "DEV": ["Wire up routing"]},
            },
            {"name": "About"},
        ]
    }
    res = api_client.post(tree_url(project), payload, format="json")
    assert res.status_code == 201, res.data

    assert Page.objects.filter(project=project).count() == 2
    landing = Page.objects.get(project=project, name="Landing")
    assert list(landing.sections.values_list("title", flat=True)) == ["MVP", "DEV", "DEPLOY"]
    assert list(landing.sections.get(title="MVP").tasks.values_list("title", flat=True)) == [
        "Write copy",
        "Add hero image",
    ]
    assert list(landing.sections.get(title="DEV").tasks.values_list("title", flat=True)) == [
        "Wire up routing"
    ]
    assert landing.sections.get(title="DEPLOY").tasks.count() == 0

    about = Page.objects.get(project=project, name="About")
    assert about.sections.count() == 3
    assert Task.objects.filter(section__page=about).count() == 0

    assert [p["name"] for p in res.data] == ["Landing", "About"]


def test_tree_rejects_an_unknown_section_and_creates_nothing(api_client, user):
    project = Project.objects.create(owner=user, name="P", description="d")
    payload = {"pages": [{"name": "OK"}, {"name": "Bad", "tasks": {"STAGING": ["x"]}}]}
    res = api_client.post(tree_url(project), payload, format="json")
    assert res.status_code == 400
    assert Page.objects.filter(project=project).count() == 0
    assert ChecklistSection.objects.count() == 0


def test_tree_requires_at_least_one_page(api_client, user):
    project = Project.objects.create(owner=user, name="P", description="d")
    res = api_client.post(tree_url(project), {"pages": []}, format="json")
    assert res.status_code == 400
    assert Page.objects.filter(project=project).count() == 0


def test_tree_under_foreign_project_is_404(api_client, other_user):
    project = Project.objects.create(owner=other_user, name="P", description="d")
    res = api_client.post(tree_url(project), {"pages": [{"name": "X"}]}, format="json")
    assert res.status_code == 404
    assert Page.objects.filter(project=project).count() == 0


def test_tree_under_missing_project_is_404(api_client):
    res = api_client.post("/checklists/projects/9999/tree/", {"pages": [{"name": "X"}]}, format="json")
    assert res.status_code == 404
