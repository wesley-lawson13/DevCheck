import logging

from rest_framework.exceptions import ValidationError

from checklists.exceptions import exception_handler


class DummyView:
    pass


def test_unhandled_exception_is_logged_and_left_for_django_to_500(caplog):
    with caplog.at_level(logging.ERROR, logger="checklists.exceptions"):
        response = exception_handler(ValueError("boom"), {"view": DummyView()})

    assert response is None
    assert "Unhandled exception in DummyView" in caplog.text


def test_handled_client_error_is_not_logged(caplog):
    with caplog.at_level(logging.ERROR, logger="checklists.exceptions"):
        response = exception_handler(ValidationError("bad input"), {"view": DummyView()})

    assert response.status_code == 400
    assert caplog.text == ""
