from django.contrib.auth.models import User
from django.core.management import call_command

from checklists.models import ChecklistSection, Project, Task


def test_seed_demo_creates_projects_across_statuses_with_partial_progress(db):
    call_command("seed_demo")

    user = User.objects.get(username="demo")
    projects = Project.objects.filter(owner=user)
    assert {p.project_status for p in projects} == set(Project.Status.values)

    for project in projects:
        # every page got all three sections, so the checklist columns render
        for page in project.pages.all():
            assert page.sections.count() == len(ChecklistSection.SECTION_CHOICES)

    tasks = Task.objects.filter(section__page__project__owner=user)
    assert 0 < tasks.filter(completed=True).count() < tasks.count()


def test_seed_demo_is_rerunnable_and_the_login_works(anon_client):
    call_command("seed_demo")
    call_command("seed_demo")

    assert User.objects.filter(username="demo").count() == 1
    assert Project.objects.filter(owner__username="demo").count() == 4

    res = anon_client.post(
        "/checklists/token/", {"username": "demo", "password": "demo-pass-123"}, format="json"
    )
    assert res.status_code == 200


def test_seed_demo_leaves_other_users_alone(db, other_user, project_tree):
    project_tree(other_user)
    call_command("seed_demo")
    assert Project.objects.filter(owner=other_user).count() == 1
