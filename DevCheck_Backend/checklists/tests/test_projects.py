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
