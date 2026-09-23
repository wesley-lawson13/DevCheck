import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from checklists.models import ChecklistSection, Page, Project, Task


@pytest.fixture(autouse=True)
def _test_settings(settings, tmp_path):
    """Keep tests independent of the developer's .env."""
    settings.SECURE_SSL_REDIRECT = False
    settings.MEDIA_ROOT = tmp_path / "media"
    settings.STORAGES = {
        **settings.STORAGES,
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    }


@pytest.fixture
def user(db):
    return User.objects.create_user(username="alice", password="s3cure-pass-123")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(username="bob", password="s3cure-pass-456")


@pytest.fixture
def api_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def anon_client(db):
    return APIClient()


@pytest.fixture
def project_tree():
    """Build a Project -> Page -> 3 sections -> one task each, for any owner."""

    def build(owner, name="Demo"):
        project = Project.objects.create(owner=owner, name=name, description="d")
        page = Page.objects.create(project=project, name="Home")
        sections = {
            title: ChecklistSection.objects.create(page=page, title=title)
            for title in ("MVP", "DEV", "DEPLOY")
        }
        tasks = {
            title: Task.objects.create(section=section, title=f"{title} task")
            for title, section in sections.items()
        }
        return project, page, sections, tasks

    return build
