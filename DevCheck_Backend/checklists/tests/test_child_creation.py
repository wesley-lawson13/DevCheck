from checklists.models import ChecklistSection, Page, Task


def test_create_page_under_foreign_project_is_404(api_client, other_user, project_tree):
    project, *_ = project_tree(other_user)
    res = api_client.post(f"/checklists/projects/{project.id}/pages/", {"name": "X"}, format="json")
    assert res.status_code == 404
    assert Page.objects.filter(name="X").count() == 0


def test_create_page_under_missing_project_is_404(api_client):
    res = api_client.post("/checklists/projects/9999/pages/", {"name": "X"}, format="json")
    assert res.status_code == 404


def test_create_section_under_foreign_page_is_404(api_client, other_user, project_tree):
    _, page, *_ = project_tree(other_user)
    before = ChecklistSection.objects.count()
    res = api_client.post(f"/checklists/pages/{page.id}/sections/", {"title": "MVP"}, format="json")
    assert res.status_code == 404
    assert ChecklistSection.objects.count() == before


def test_create_section_under_missing_page_is_404(api_client):
    res = api_client.post("/checklists/pages/9999/sections/", {"title": "MVP"}, format="json")
    assert res.status_code == 404


def test_create_task_under_foreign_section_is_404(api_client, other_user, project_tree):
    _, _, sections, _ = project_tree(other_user)
    before = Task.objects.count()
    res = api_client.post(
        f"/checklists/sections/{sections['MVP'].id}/tasks/", {"title": "T"}, format="json"
    )
    assert res.status_code == 404
    assert Task.objects.count() == before


def test_create_task_under_missing_section_is_404(api_client):
    res = api_client.post("/checklists/sections/9999/tasks/", {"title": "T"}, format="json")
    assert res.status_code == 404


def test_duplicate_section_is_400(api_client, user, project_tree):
    _, page, *_ = project_tree(user)
    res = api_client.post(f"/checklists/pages/{page.id}/sections/", {"title": "MVP"}, format="json")
    assert res.status_code == 400
    assert "title" in res.data
    assert page.sections.filter(title="MVP").count() == 1


def test_new_section_title_is_created(api_client, user, project_tree):
    _, page, sections, _ = project_tree(user)
    sections["DEV"].delete()
    res = api_client.post(f"/checklists/pages/{page.id}/sections/", {"title": "DEV"}, format="json")
    assert res.status_code == 201, res.data


def test_renaming_section_to_existing_title_is_400(api_client, user, project_tree):
    _, _, sections, _ = project_tree(user)
    res = api_client.patch(
        f"/checklists/sections/{sections['DEV'].id}/", {"title": "MVP"}, format="json"
    )
    assert res.status_code == 400


def test_patching_section_with_its_own_title_is_ok(api_client, user, project_tree):
    _, _, sections, _ = project_tree(user)
    res = api_client.patch(
        f"/checklists/sections/{sections['DEV'].id}/", {"title": "DEV"}, format="json"
    )
    assert res.status_code == 200
