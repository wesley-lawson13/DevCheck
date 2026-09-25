import pytest

from checklists.models import Project

LIST_URL = "/checklists/projects/"


def detail_url(project):
    return f"/checklists/projects/{project.id}/detail/"


def test_status_defaults_to_mvp(api_client):
    res = api_client.post(LIST_URL, {"name": "P", "description": "d"}, format="json")
    assert res.status_code == 201
    assert res.data["project_status"] == "MVP"


@pytest.mark.parametrize("code", ["MVP", "DEV", "DEPLOY"])
def test_valid_status_codes_are_accepted(api_client, user, code):
    project = Project.objects.create(owner=user, name="P", description="d")
    res = api_client.patch(detail_url(project), {"project_status": code}, format="json")
    assert res.status_code == 200, res.data
    project.refresh_from_db()
    assert project.project_status == code


@pytest.mark.parametrize("bad", ["In Development", "banana", ""])
def test_invalid_status_is_400(api_client, user, bad):
    project = Project.objects.create(owner=user, name="P", description="d")
    res = api_client.patch(detail_url(project), {"project_status": bad}, format="json")
    assert res.status_code == 400
    assert "project_status" in res.data
    project.refresh_from_db()
    assert project.project_status == "MVP"


def test_create_with_invalid_status_is_400(api_client):
    res = api_client.post(
        LIST_URL, {"name": "P", "description": "d", "project_status": "nope"}, format="json"
    )
    assert res.status_code == 400
    assert not Project.objects.exists()


# --- 2.3: list / create / update / delete ---

def delete_url(project):
    return f"/checklists/projects/delete/{project.id}/"


def rows(res):
    return res.data if isinstance(res.data, list) else res.data["results"]


def test_list_shows_only_own_projects(api_client, user, other_user):
    Project.objects.create(owner=user, name="mine-1", description="d")
    Project.objects.create(owner=user, name="mine-2", description="d")
    Project.objects.create(owner=other_user, name="theirs", description="d")
    res = api_client.get(LIST_URL)
    assert res.status_code == 200
    assert sorted(p["name"] for p in rows(res)) == ["mine-1", "mine-2"]


def test_create_assigns_the_caller_as_owner(api_client, user, other_user):
    res = api_client.post(
        LIST_URL, {"name": "P", "description": "d", "owner": other_user.id}, format="json"
    )
    assert res.status_code == 201, res.data
    assert Project.objects.get().owner == user


@pytest.mark.parametrize("missing", ["name", "description"])
def test_create_requires_name_and_description(api_client, missing):
    body = {"name": "P", "description": "d"}
    del body[missing]
    res = api_client.post(LIST_URL, body, format="json")
    assert res.status_code == 400
    assert missing in res.data
    assert not Project.objects.exists()


def test_create_rejects_a_non_http_link(api_client):
    res = api_client.post(
        LIST_URL, {"name": "P", "description": "d", "link": "javascript:alert(1)"}, format="json"
    )
    assert res.status_code == 400
    assert "link" in res.data


def test_patch_updates_fields_and_ignores_owner(api_client, user, other_user):
    project = Project.objects.create(owner=user, name="P", description="d")
    res = api_client.patch(
        detail_url(project),
        {"name": "New", "description": "e", "link": "https://example.com", "owner": other_user.id},
        format="json",
    )
    assert res.status_code == 200, res.data
    project.refresh_from_db()
    assert (project.name, project.description, project.link) == ("New", "e", "https://example.com")
    assert project.owner == user


def test_delete_removes_the_project(api_client, user):
    project = Project.objects.create(owner=user, name="P", description="d")
    res = api_client.delete(delete_url(project))
    assert res.status_code == 204
    assert not Project.objects.filter(pk=project.pk).exists()


def test_delete_cascades_to_the_whole_tree(api_client, user, other_user, project_tree):
    from checklists.models import ChecklistSection, Page, Task

    project, *_ = project_tree(user, name="Doomed")
    project_tree(other_user, name="Survivor")
    res = api_client.delete(delete_url(project))
    assert res.status_code == 204
    # only the other user's tree (1 page, 3 sections, 3 tasks) is left
    assert Project.objects.get().name == "Survivor"
    assert (Page.objects.count(), ChecklistSection.objects.count(), Task.objects.count()) == (1, 3, 3)


def test_delete_missing_project_is_404(api_client):
    assert api_client.delete("/checklists/projects/delete/9999/").status_code == 404


def test_detail_returns_the_nested_tree(api_client, user, project_tree):
    project, *_ = project_tree(user)
    res = api_client.get(detail_url(project))
    assert res.status_code == 200
    (page,) = res.data["pages"]
    assert sorted(s["title"] for s in page["sections"]) == ["DEPLOY", "DEV", "MVP"]
    assert all(len(s["tasks"]) == 1 for s in page["sections"])
    assert set(page["sections"][0]["tasks"][0]) == {"id", "title", "completed"}


def test_viewing_the_detail_does_not_update_last_viewed_at(api_client, user):
    project = Project.objects.create(owner=user, name="P", description="d")
    api_client.get(detail_url(project))
    project.refresh_from_db()
    assert project.last_viewed_at is None


def test_viewed_endpoint_sets_last_viewed_at(api_client, user):
    project = Project.objects.create(owner=user, name="P", description="d")
    res = api_client.post(f"/checklists/projects/{project.id}/viewed/")
    assert res.status_code == 204
    project.refresh_from_db()
    assert project.last_viewed_at is not None


def test_viewed_endpoint_is_scoped_to_the_owner(api_client, other_user):
    project = Project.objects.create(owner=other_user, name="P", description="d")
    res = api_client.post(f"/checklists/projects/{project.id}/viewed/")
    assert res.status_code == 404
    project.refresh_from_db()
    assert project.last_viewed_at is None
