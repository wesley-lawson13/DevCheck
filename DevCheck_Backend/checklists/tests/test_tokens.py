import pytest
from rest_framework.test import APIClient

TOKEN = "/checklists/token/"
REFRESH = "/checklists/token/refresh/"
BLACKLIST = "/checklists/token/blacklist/"


@pytest.fixture
def tokens(user):
    res = APIClient().post(TOKEN, {"username": "alice", "password": "s3cure-pass-123"}, format="json")
    assert res.status_code == 200, res.data
    return res.data


def test_blacklisted_refresh_token_is_rejected(tokens):
    client = APIClient()
    assert client.post(BLACKLIST, {"refresh": tokens["refresh"]}, format="json").status_code == 200
    res = client.post(REFRESH, {"refresh": tokens["refresh"]}, format="json")
    assert res.status_code == 401


def test_refresh_rotates_and_invalidates_the_old_token(tokens):
    client = APIClient()
    first = client.post(REFRESH, {"refresh": tokens["refresh"]}, format="json")
    assert first.status_code == 200
    assert first.data["refresh"] != tokens["refresh"]
    # the old refresh token was blacklisted on rotation
    assert client.post(REFRESH, {"refresh": tokens["refresh"]}, format="json").status_code == 401
    # the new one still works
    assert client.post(REFRESH, {"refresh": first.data["refresh"]}, format="json").status_code == 200


def test_blacklist_rejects_garbage_token(user):
    res = APIClient().post(BLACKLIST, {"refresh": "not-a-token"}, format="json")
    assert res.status_code == 401
