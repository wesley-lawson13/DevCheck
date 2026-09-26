import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from checklists.models import Project
from checklists.serializers import DEFAULT_PROJECT_IMAGE_URL

LIST_URL = "/checklists/projects/"


def detail_url(project):
    return f"/checklists/projects/{project.id}/detail/"


def make_image(name="thumb.png", size=(4, 4)):
    buf = io.BytesIO()
    Image.new("RGB", size, "red").save(buf, format="PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


def payload(**extra):
    return {"name": "Demo", "description": "desc", **extra}


@pytest.mark.django_db
def test_multipart_create_stores_the_file(api_client, settings):
    res = api_client.post(LIST_URL, payload(image=make_image()), format="multipart")
    assert res.status_code == 201, res.data
    project = Project.objects.get()
    assert project.image
    assert (settings.MEDIA_ROOT / project.image.name).exists()
    assert res.data["image"].startswith("http://testserver/media/projects/")


def test_create_without_image_returns_default_logo(api_client):
    res = api_client.post(LIST_URL, payload(), format="multipart")
    assert res.status_code == 201, res.data
    assert Project.objects.get().image.name in (None, "")
    assert res.data["image"] == DEFAULT_PROJECT_IMAGE_URL


def test_detail_returns_uploaded_image_url(api_client, user):
    project = Project.objects.create(owner=user, name="P", description="d", image=make_image())
    res = api_client.get(detail_url(project))
    assert res.data["image"].startswith("http://testserver/media/projects/")


def test_multipart_patch_replaces_image(api_client, user):
    project = Project.objects.create(
        owner=user, name="P", description="d", image=make_image("old.png")
    )
    old_name = project.image.name
    res = api_client.patch(
        detail_url(project), {"image": make_image("new.png")}, format="multipart"
    )
    assert res.status_code == 200, res.data
    project.refresh_from_db()
    assert project.image.name != old_name


def test_multipart_patch_empty_image_clears_it(api_client, user):
    project = Project.objects.create(owner=user, name="P", description="d", image=make_image())
    res = api_client.patch(detail_url(project), {"image": ""}, format="multipart")
    assert res.status_code == 200, res.data
    project.refresh_from_db()
    assert not project.image
    assert res.data["image"] == DEFAULT_PROJECT_IMAGE_URL


def test_json_patch_null_image_clears_it(api_client, user):
    project = Project.objects.create(owner=user, name="P", description="d", image=make_image())
    res = api_client.patch(detail_url(project), {"image": None}, format="json")
    assert res.status_code == 200, res.data
    project.refresh_from_db()
    assert not project.image


def test_json_patch_without_image_keeps_it(api_client, user):
    project = Project.objects.create(owner=user, name="P", description="d", image=make_image())
    res = api_client.patch(detail_url(project), {"name": "Renamed"}, format="json")
    assert res.status_code == 200, res.data
    project.refresh_from_db()
    assert project.image and project.name == "Renamed"


def test_oversized_image_is_rejected(api_client):
    big = SimpleUploadedFile("big.png", b"0" * (10 * 1024 * 1024 + 1), content_type="image/png")
    res = api_client.post(LIST_URL, payload(image=big), format="multipart")
    assert res.status_code == 400
    assert "image" in res.data
    assert not Project.objects.exists()


def test_non_image_upload_is_rejected(api_client):
    txt = SimpleUploadedFile("notes.txt", b"hello", content_type="text/plain")
    res = api_client.post(LIST_URL, payload(image=txt), format="multipart")
    assert res.status_code == 400
    assert "image" in res.data


# --- 1.3: JSON accepted on project views (was 415) ---


def test_json_patch_status_and_name(api_client, user):
    project = Project.objects.create(owner=user, name="P", description="d")
    res = api_client.patch(
        detail_url(project), {"project_status": "DEV", "name": "New"}, format="json"
    )
    assert res.status_code == 200, res.data
    project.refresh_from_db()
    assert (project.name, project.project_status) == ("New", "DEV")


def test_json_create_project(api_client):
    res = api_client.post(LIST_URL, payload(), format="json")
    assert res.status_code == 201, res.data
