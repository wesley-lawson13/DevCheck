"""Ownership matrix: every endpoint x method against another user's objects.

Detail endpoints must 404 (not 403, so existence isn't leaked) and change nothing. List
endpoints scoped to a foreign parent must return an empty list, and creates must 404.
The database is snapshotted before and after each request to prove nothing was touched.
"""

import pytest

from checklists.models import ChecklistSection, Issue, Page, Project, Task


def snapshot():
    return {
        model.__name__: list(model.objects.order_by("pk").values())
        for model in (Project, Page, ChecklistSection, Task, Issue)
    }


# (label, method, url template, body). Templates use the foreign object ids.
DETAIL_CASES = [
    ("project-detail-get", "get", "/checklists/projects/{project}/detail/", None),
    ("project-detail-patch", "patch", "/checklists/projects/{project}/detail/", {"name": "pwned"}),
    (
        "project-detail-put",
        "put",
        "/checklists/projects/{project}/detail/",
        {"name": "pwned", "description": "x", "project_status": "DEV"},
    ),
    ("project-delete", "delete", "/checklists/projects/delete/{project}/", None),
    ("project-viewed", "post", "/checklists/projects/{project}/viewed/", None),
    ("project-tree-create", "post", "/checklists/projects/{project}/tree/", {"pages": [{"name": "pwned"}]}),
    ("page-get", "get", "/checklists/pages/{page}/", None),
    ("page-patch", "patch", "/checklists/pages/{page}/", {"name": "pwned"}),
    ("page-put", "put", "/checklists/pages/{page}/", {"name": "pwned", "order": 3}),
    ("page-delete", "delete", "/checklists/pages/{page}/", None),
    ("section-get", "get", "/checklists/sections/{section}/", None),
    ("section-patch", "patch", "/checklists/sections/{section}/", {"order": 9}),
    ("section-put", "put", "/checklists/sections/{section}/", {"title": "MVP", "order": 9}),
    ("section-delete", "delete", "/checklists/sections/{section}/", None),
    ("task-get", "get", "/checklists/tasks/{task}/", None),
    ("task-patch", "patch", "/checklists/tasks/{task}/", {"completed": True}),
    ("task-put", "put", "/checklists/tasks/{task}/", {"title": "pwned", "completed": True}),
    ("task-delete", "delete", "/checklists/tasks/{task}/", None),
    ("page-create", "post", "/checklists/projects/{project}/pages/", {"name": "pwned"}),
    ("section-create", "post", "/checklists/projects/{page}/sections/", {"title": "MVP"}),
    ("task-create", "post", "/checklists/projects/{section}/tasks/", {"title": "pwned"}),
]

LIST_CASES = [
    ("pages", "/checklists/projects/{project}/pages/"),
    ("sections", "/checklists/projects/{page}/sections/"),
    ("tasks", "/checklists/projects/{section}/tasks/"),
]


@pytest.fixture
def foreign(other_user, project_tree):
    """ids of a full tree owned by someone else (the URL kwargs the templates expect)."""
    project, page, sections, tasks = project_tree(other_user, name="Bob's project")
    return {
        "project": project.id,
        "page": page.id,
        "section": sections["MVP"].id,
        "task": tasks["MVP"].id,
    }


@pytest.mark.parametrize("label, method, template, body", DETAIL_CASES, ids=[c[0] for c in DETAIL_CASES])
def test_foreign_object_is_404_and_untouched(api_client, foreign, label, method, template, body):
    before = snapshot()
    res = getattr(api_client, method)(template.format(**foreign), body, format="json")
    assert res.status_code == 404, res.data
    assert snapshot() == before


@pytest.mark.parametrize("label, template", LIST_CASES, ids=[c[0] for c in LIST_CASES])
def test_foreign_parent_list_is_empty(api_client, foreign, label, template):
    res = api_client.get(template.format(**foreign))
    assert res.status_code == 200
    assert list(res.data if isinstance(res.data, list) else res.data["results"]) == []


def test_project_list_hides_foreign_projects(api_client, foreign):
    res = api_client.get("/checklists/projects/")
    assert res.status_code == 200
    assert list(res.data if isinstance(res.data, list) else res.data["results"]) == []


def test_owner_still_has_access_to_the_same_objects(other_user, foreign):
    """Guard against the matrix passing only because every URL is broken."""
    from rest_framework.test import APIClient

    owner = APIClient()
    owner.force_authenticate(user=other_user)
    for label, method, template, body in DETAIL_CASES:
        if method != "get":
            continue
        res = owner.get(template.format(**foreign))
        assert res.status_code == 200, label


def test_users_do_not_see_each_others_children_in_project_detail(
    api_client, user, other_user, project_tree
):
    mine, *_ = project_tree(user, name="Mine")
    project_tree(other_user, name="Theirs")
    res = api_client.get(f"/checklists/projects/{mine.id}/detail/")
    assert res.status_code == 200
    titles = [t["title"] for p in res.data["pages"] for s in p["sections"] for t in s["tasks"]]
    assert titles and len(titles) == 3  # only the three tasks in my own tree
