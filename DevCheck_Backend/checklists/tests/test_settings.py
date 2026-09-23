import importlib
import runpy

import pytest
from django.urls import clear_url_caches

CLOUDINARY_VARS = ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")
FILESYSTEM = "django.core.files.storage.FileSystemStorage"
CLOUDINARY = "cloudinary_storage.storage.MediaCloudinaryStorage"


def load_settings(monkeypatch, *, cloudinary, debug):
    for var in CLOUDINARY_VARS:
        monkeypatch.setenv(var, "x" if cloudinary else "")
    monkeypatch.setenv("DEBUG", "True" if debug else "False")
    return runpy.run_module("DevCheck_Backend.settings")


def test_filesystem_storage_without_cloudinary_env(monkeypatch):
    conf = load_settings(monkeypatch, cloudinary=False, debug=True)
    assert conf["STORAGES"]["default"]["BACKEND"] == FILESYSTEM


def test_cloudinary_storage_with_cloudinary_env_outside_debug(monkeypatch):
    conf = load_settings(monkeypatch, cloudinary=True, debug=False)
    assert conf["STORAGES"]["default"]["BACKEND"] == CLOUDINARY


def test_debug_uses_local_storage_even_with_cloudinary_env(monkeypatch):
    conf = load_settings(monkeypatch, cloudinary=True, debug=True)
    assert conf["STORAGES"]["default"]["BACKEND"] == FILESYSTEM


def test_media_is_not_served_from_site_root(monkeypatch):
    conf = load_settings(monkeypatch, cloudinary=False, debug=True)
    assert conf["MEDIA_URL"] == "/media/"
    assert conf["MEDIA_ROOT"].name == "media"


def test_https_hardening_only_outside_debug(monkeypatch):
    assert "SECURE_SSL_REDIRECT" not in load_settings(monkeypatch, cloudinary=False, debug=True)
    assert load_settings(monkeypatch, cloudinary=False, debug=False)["SECURE_SSL_REDIRECT"] is True


@pytest.fixture
def debug_urls(settings):
    """Re-import the urlconf with DEBUG on, as runserver would see it."""
    import DevCheck_Backend.urls as urls

    settings.DEBUG = True
    importlib.reload(urls)
    clear_url_caches()
    yield
    settings.DEBUG = False
    importlib.reload(urls)
    clear_url_caches()


def test_project_root_files_are_not_served_in_debug(debug_urls, anon_client):
    assert anon_client.get("/.env").status_code == 404
    assert anon_client.get("/db.sqlite3").status_code == 404


def test_missing_secret_key_fails_outside_debug(monkeypatch):
    from django.core.exceptions import ImproperlyConfigured

    monkeypatch.setenv("SECRET_KEY", "")
    with pytest.raises(ImproperlyConfigured):
        load_settings(monkeypatch, cloudinary=False, debug=False)


def test_missing_secret_key_is_tolerated_in_debug(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "")
    conf = load_settings(monkeypatch, cloudinary=False, debug=True)
    assert conf["SECRET_KEY"] == "unsafe-dev-key"
