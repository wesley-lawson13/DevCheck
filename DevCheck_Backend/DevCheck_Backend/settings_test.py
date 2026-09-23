"""Settings used by pytest so tests don't depend on the developer's .env."""

import os

# settings.py refuses to load without a SECRET_KEY when DEBUG is off.
os.environ.setdefault("SECRET_KEY", "test-secret-key")

from .settings import *  # noqa: E402,F401,F403
