"""Page / section / task CRUD, task toggling and section uniqueness."""

import pytest

from checklists.models import ChecklistSection, Page, Task

PAGES = "/checklists/projects/{}/pages/"
SECTIONS = "/checklists/projects/{}/sections/"  # NB: keyed by page id
TASKS = "/checklists/projects/{}/tasks/"  # NB: keyed by section id


def rows(res):
    return res.data if isinstance(res.data, list) else res.data["results"]


# --- pages ---

def test_create_and_list_pages(api_client, user, project_tree):
    project, *_ = project_tree(user)
    res = api_client.post(PAGES.format(project.id), {"name": "About"}, format="json")
    assert res.status_code == 201, res.data
    assert res.data["project"] == project.id
    listing = api_client.get(PAGES.format(project.id))
    assert sorted(p["name"] for p in rows(listing)) == ["About", "Home"]


def test_create_page_requires_a_name(api_client, user, project_tree):
    project, *_ = project_tree(user)
    assert api_client.post(PAGES.format(project.id), {}, format="json").status_code == 400


def test_rename_page(api_client, user, project_tree):
    _, page, *_ = project_tree(user)
    res = api_client.patch(f"/checklists/pages/{page.id}/", {"name": "Landing"}, format="json")
    assert res.status_code == 200
    page.refresh_from_db()
    assert page.name == "Landing"


def test_page_cannot_be_moved_to_another_project(api_client, user, project_tree):
    project, page, *_ = project_tree(user)
    other, *_ = project_tree(user, name="Second")
    api_client.patch(f"/checklists/pages/{page.id}/", {"project": other.id}, format="json")
    page.refresh_from_db()
    assert page.project_id == project.id


def test_delete_page_cascades_to_sections_and_tasks(api_client, user, project_tree):
    _, page, *_ = project_tree(user)
    res = api_client.delete(f"/checklists/pages/{page.id}/")
    assert res.status_code == 204
    assert (Page.objects.count(), ChecklistSection.objects.count(), Task.objects.count()) == (0, 0, 0)


# --- sections ---

def test_create_and_list_sections(api_client, user, project_tree):
    _, page, sections, _ = project_tree(user)
    sections["DEPLOY"].delete()
    res = api_client.post(SECTIONS.format(page.id), {"title": "DEPLOY"}, format="json")
    assert res.status_code == 201, res.data
    assert res.data["page"] == page.id
    listing = api_client.get(SECTIONS.format(page.id))
    assert sorted(s["title"] for s in rows(listing)) == ["DEPLOY", "DEV", "MVP"]


def test_section_title_must_be_a_valid_choice(api_client, user, project_tree):
    _, page, sections, _ = project_tree(user)
    sections["DEV"].delete()
    res = api_client.post(SECTIONS.format(page.id), {"title": "STAGING"}, format="json")
    assert res.status_code == 400
    assert "title" in res.data


def test_same_title_is_allowed_on_different_pages(api_client, user, project_tree):
    project, _, *_ = project_tree(user)
    second = Page.objects.create(project=project, name="Second")
    res = api_client.post(SECTIONS.format(second.id), {"title": "MVP"}, format="json")
    assert res.status_code == 201, res.data


def test_duplicate_section_leaves_data_untouched(api_client, user, project_tree):
    _, page, *_ = project_tree(user)
    res = api_client.post(SECTIONS.format(page.id), {"title": "DEV"}, format="json")
    assert res.status_code == 400
    assert page.sections.count() == 3


def test_delete_section_cascades_to_its_tasks(api_client, user, project_tree):
    _, page, sections, _ = project_tree(user)
    res = api_client.delete(f"/checklists/sections/{sections['MVP'].id}/")
    assert res.status_code == 204
    assert page.sections.count() == 2
    assert Task.objects.count() == 2


# --- tasks ---

def test_create_and_list_tasks(api_client, user, project_tree):
    _, _, sections, _ = project_tree(user)
    url = TASKS.format(sections["MVP"].id)
    res = api_client.post(url, {"title": "Ship it"}, format="json")
    assert res.status_code == 201, res.data
    assert res.data["completed"] is False
    assert res.data["section"] == sections["MVP"].id
    assert sorted(t["title"] for t in rows(api_client.get(url))) == ["MVP task", "Ship it"]


def test_task_list_is_scoped_to_its_section(api_client, user, project_tree):
    _, _, sections, _ = project_tree(user)
    res = api_client.get(TASKS.format(sections["DEV"].id))
    assert [t["title"] for t in rows(res)] == ["DEV task"]


def test_create_task_requires_a_title(api_client, user, project_tree):
    _, _, sections, _ = project_tree(user)
    assert api_client.post(TASKS.format(sections["MVP"].id), {}, format="json").status_code == 400


def test_toggle_task_both_ways(api_client, user, project_tree):
    _, _, _, tasks = project_tree(user)
    task = tasks["MVP"]
    url = f"/checklists/tasks/{task.id}/"
    assert api_client.patch(url, {"completed": True}, format="json").status_code == 200
    task.refresh_from_db()
    assert task.completed is True
    assert api_client.patch(url, {"completed": False}, format="json").status_code == 200
    task.refresh_from_db()
    assert task.completed is False


def test_toggle_leaves_the_title_alone(api_client, user, project_tree):
    _, _, _, tasks = project_tree(user)
    api_client.patch(f"/checklists/tasks/{tasks['DEV'].id}/", {"completed": True}, format="json")
    tasks["DEV"].refresh_from_db()
    assert tasks["DEV"].title == "DEV task"


def test_task_cannot_be_moved_to_another_section(api_client, user, project_tree):
    _, _, sections, tasks = project_tree(user)
    api_client.patch(
        f"/checklists/tasks/{tasks['MVP'].id}/", {"section": sections["DEV"].id}, format="json"
    )
    tasks["MVP"].refresh_from_db()
    assert tasks["MVP"].section_id == sections["MVP"].id


def test_edit_task_title(api_client, user, project_tree):
    _, _, _, tasks = project_tree(user)
    res = api_client.patch(f"/checklists/tasks/{tasks['MVP'].id}/", {"title": "Renamed"}, format="json")
    assert res.status_code == 200
    tasks["MVP"].refresh_from_db()
    assert tasks["MVP"].title == "Renamed"


def test_delete_task(api_client, user, project_tree):
    _, _, sections, tasks = project_tree(user)
    res = api_client.delete(f"/checklists/tasks/{tasks['MVP'].id}/")
    assert res.status_code == 204
    assert sections["MVP"].tasks.count() == 0
    assert Task.objects.count() == 2


def test_missing_ids_are_404(api_client):
    for url in ("/checklists/pages/9999/", "/checklists/sections/9999/", "/checklists/tasks/9999/"):
        assert api_client.get(url).status_code == 404
