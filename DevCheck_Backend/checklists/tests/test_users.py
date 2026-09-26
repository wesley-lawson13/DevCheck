import pytest
from django.contrib.auth.models import User

REGISTER = "/checklists/user/register/"
USER = "/checklists/user/"


def test_register_hashes_password(anon_client):
    res = anon_client.post(
        REGISTER, {"username": "carol", "password": "a-Good-pass-987"}, format="json"
    )
    assert res.status_code == 201, res.data
    assert "password" not in res.data
    user = User.objects.get(username="carol")
    assert user.password != "a-Good-pass-987"
    assert user.check_password("a-Good-pass-987")


@pytest.mark.parametrize("weak", ["1", "password", "12345678", "short"])
def test_register_rejects_weak_password(anon_client, weak):
    res = anon_client.post(REGISTER, {"username": "carol", "password": weak}, format="json")
    assert res.status_code == 400
    assert "password" in res.data
    assert not User.objects.filter(username="carol").exists()


def test_register_rejects_password_similar_to_username(anon_client):
    res = anon_client.post(
        REGISTER, {"username": "carolsmith", "password": "carolsmith"}, format="json"
    )
    assert res.status_code == 400


def test_get_current_user_has_no_password(api_client, user):
    res = api_client.get(USER)
    assert res.status_code == 200
    assert res.data["username"] == user.username
    assert "password" not in res.data


@pytest.mark.parametrize("method", ["patch", "put"])
def test_user_endpoint_is_read_only(api_client, user, method):
    old_hash = user.password
    res = getattr(api_client, method)(
        USER, {"password": "plaintext", "username": "hax"}, format="json"
    )
    assert res.status_code == 405
    user.refresh_from_db()
    assert user.password == old_hash and user.username == "alice"
