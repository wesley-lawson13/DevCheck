def test_anonymous_project_list_is_unauthorized(anon_client):
    assert anon_client.get("/checklists/projects/").status_code == 401
