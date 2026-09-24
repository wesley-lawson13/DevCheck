"""The auth flow end to end: register -> obtain token -> call the API -> refresh.

Password hashing/validation and refresh rotation/blacklisting live in test_users.py and
test_tokens.py; this file covers the flow that ties them together and the anonymous 401s.
"""

import pytest
from rest_framework.test import APIClient

REGISTER = "/checklists/user/register/"
USER = "/checklists/user/"
TOKEN = "/checklists/token/"
REFRESH = "/checklists/token/refresh/"

PASSWORD = "a-Good-pass-987"


def bearer_client(access):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return client


def test_register_login_and_call_api(anon_client):
    res = anon_client.post(REGISTER, {"username": "carol", "password": PASSWORD}, format="json")
    assert res.status_code == 201, res.data

    res = anon_client.post(TOKEN, {"username": "carol", "password": PASSWORD}, format="json")
    assert res.status_code == 200, res.data
    assert set(res.data) == {"access", "refresh"}

    me = bearer_client(res.data["access"]).get(USER)
    assert me.status_code == 200
    assert me.data["username"] == "carol"


def test_register_duplicate_username_is_400(anon_client, user):
    res = anon_client.post(REGISTER, {"username": user.username, "password": PASSWORD}, format="json")
    assert res.status_code == 400
    assert "username" in res.data


@pytest.mark.parametrize("payload", [{}, {"username": "carol"}, {"password": PASSWORD}])
def test_register_requires_username_and_password(anon_client, payload):
    res = anon_client.post(REGISTER, payload, format="json")
    assert res.status_code == 400


def test_register_does_not_require_authentication(anon_client):
    # AllowAny: a logged-out visitor must be able to sign up
    res = anon_client.post(REGISTER, {"username": "dave", "password": PASSWORD}, format="json")
    assert res.status_code == 201


@pytest.mark.parametrize(
    "credentials",
    [
        {"username": "alice", "password": "wrong"},
        {"username": "nobody", "password": "s3cure-pass-123"},
        {"username": "alice"},
        {},
    ],
)
def test_token_obtain_rejects_bad_credentials(anon_client, user, credentials):
    res = anon_client.post(TOKEN, credentials, format="json")
    assert res.status_code in (400, 401)
    assert "access" not in res.data


def test_refresh_returns_a_working_access_token(anon_client, user):
    tokens = anon_client.post(
        TOKEN, {"username": "alice", "password": "s3cure-pass-123"}, format="json"
    ).data
    res = anon_client.post(REFRESH, {"refresh": tokens["refresh"]}, format="json")
    assert res.status_code == 200
    assert bearer_client(res.data["access"]).get(USER).status_code == 200


def test_refresh_rejects_an_access_token(anon_client, user):
    tokens = anon_client.post(
        TOKEN, {"username": "alice", "password": "s3cure-pass-123"}, format="json"
    ).data
    res = anon_client.post(REFRESH, {"refresh": tokens["access"]}, format="json")
    assert res.status_code == 401


def test_refresh_token_cannot_authenticate_requests(anon_client, user):
    tokens = anon_client.post(
        TOKEN, {"username": "alice", "password": "s3cure-pass-123"}, format="json"
    ).data
    assert bearer_client(tokens["refresh"]).get(USER).status_code == 401


def test_garbage_bearer_token_is_401(anon_client):
    assert bearer_client("not-a-jwt").get(USER).status_code == 401


def test_get_current_user_returns_only_the_caller(api_client, user, other_user):
    res = api_client.get(USER)
    assert res.status_code == 200
    assert res.data["id"] == user.id
    assert set(res.data) == {"id", "username", "date_joined"}


@pytest.mark.parametrize(
    "method, url",
    [
        ("get", USER),
        ("get", "/checklists/projects/"),
        ("post", "/checklists/projects/"),
        ("get", "/checklists/projects/1/detail/"),
        ("patch", "/checklists/projects/1/detail/"),
        ("delete", "/checklists/projects/delete/1/"),
        ("get", "/checklists/projects/1/pages/"),
        ("post", "/checklists/projects/1/pages/"),
        ("get", "/checklists/pages/1/"),
        ("patch", "/checklists/pages/1/"),
        ("delete", "/checklists/pages/1/"),
        ("get", "/checklists/projects/1/sections/"),
        ("post", "/checklists/projects/1/sections/"),
        ("get", "/checklists/sections/1/"),
        ("patch", "/checklists/sections/1/"),
        ("delete", "/checklists/sections/1/"),
        ("get", "/checklists/projects/1/tasks/"),
        ("post", "/checklists/projects/1/tasks/"),
        ("get", "/checklists/tasks/1/"),
        ("patch", "/checklists/tasks/1/"),
        ("delete", "/checklists/tasks/1/"),
        ("post", "/checklists/issues/"),
    ],
)
def test_anonymous_requests_are_401(anon_client, method, url):
    res = getattr(anon_client, method)(url, {}, format="json")
    assert res.status_code == 401
