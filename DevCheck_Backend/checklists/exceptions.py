import logging

from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def exception_handler(exc, context):
    """Wraps DRF's default handler to log server errors (unhandled exceptions
    and any view that deliberately returns a 5xx) before returning the response."""
    response = drf_exception_handler(exc, context)

    if response is None or response.status_code >= 500:
        view = context.get("view")
        logger.error(
            "Unhandled exception in %s", view.__class__.__name__ if view else "view",
            exc_info=exc,
        )

    return response
