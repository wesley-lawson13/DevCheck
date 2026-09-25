"""Issue reporting, and D2: deleting a user must not be blocked by their issue reports."""

from checklists.models import Issue


def test_create_issue_assigns_the_caller(api_client, user):
    res = api_client.post("/checklists/issues/", {"description": "Broken button"}, format="json")
    assert res.status_code == 201, res.data
    assert res.data["user"] == user.id
    assert Issue.objects.get().user == user


def test_deleting_a_user_does_not_block_on_their_issues(user):
    Issue.objects.create(user=user, description="Something's off")
    user.delete()
    issue = Issue.objects.get()
    assert issue.user is None
