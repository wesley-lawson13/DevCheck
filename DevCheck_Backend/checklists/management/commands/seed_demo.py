"""Create a demo user with a few realistic projects, for recording the app on camera."""

from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from checklists.models import Project, Task
from checklists.serializers import ProjectTreeSerializer

# Each task is (title, done). Pages hold tasks grouped by section (MVP / DEV / DEPLOY).
DEMO_PROJECTS = [
    {
        "name": "Portfolio Site",
        "description": "Personal portfolio with project write-ups and a contact form.",
        "status": Project.Status.DEPLOY,
        "viewed_days_ago": 0,
        "pages": {
            "Home": {
                "MVP": [("Hero section", True), ("Project grid", True), ("Contact link", True)],
                "DEV": [
                    ("Responsive layout", True),
                    ("Dark mode", True),
                    ("Accessibility pass", False),
                ],
                "DEPLOY": [("Custom domain", True), ("Analytics", False)],
            },
            "Projects": {
                "MVP": [("Project cards", True), ("Detail view", True)],
                "DEV": [("Filter by tag", True), ("Image lazy loading", True)],
                "DEPLOY": [("Sitemap", False)],
            },
        },
    },
    {
        "name": "Recipe Box",
        "description": "Save, tag and search family recipes.",
        "status": Project.Status.DEV,
        "viewed_days_ago": 1,
        "pages": {
            "Recipe List": {
                "MVP": [("List recipes", True), ("Add recipe form", True), ("Delete recipe", True)],
                "DEV": [
                    ("Search by ingredient", True),
                    ("Tag filters", False),
                    ("Pagination", False),
                ],
                "DEPLOY": [("Seed sample recipes", False)],
            },
            "Recipe Detail": {
                "MVP": [("Ingredients + steps", True), ("Edit recipe", False)],
                "DEV": [("Scale servings", False), ("Print view", False)],
                "DEPLOY": [],
            },
        },
    },
    {
        "name": "Weather Dashboard",
        "description": "Forecast cards for saved cities, backed by a public weather API.",
        "status": Project.Status.DEV,
        "viewed_days_ago": 4,
        "pages": {
            "Dashboard": {
                "MVP": [("City search", True), ("Current conditions card", True)],
                "DEV": [("5-day forecast", True), ("Unit toggle", False), ("Saved cities", False)],
                "DEPLOY": [("API key handling", False)],
            },
        },
    },
    {
        "name": "Budget Tracker",
        "description": "Track monthly income and expenses by category.",
        "status": Project.Status.MVP,
        "viewed_days_ago": None,
        "pages": {
            "Transactions": {
                "MVP": [
                    ("Add transaction", True),
                    ("List transactions", False),
                    ("Categories", False),
                ],
                "DEV": [("Monthly summary chart", False)],
                "DEPLOY": [],
            },
            "Reports": {
                "MVP": [("Totals by category", False)],
                "DEV": [("CSV export", False)],
                "DEPLOY": [],
            },
        },
    },
]


def build_tree_payload(pages):
    """Turn {page: {section: [(title, done)]}} into a tree-create payload."""
    return {
        "pages": [
            {
                "name": page_name,
                "tasks": {
                    section: [title for title, _ in tasks]
                    for section, tasks in sections.items()
                    if tasks
                },
            }
            for page_name, sections in pages.items()
        ]
    }


class Command(BaseCommand):
    help = "Create (or refresh) a demo user with sample projects, pages and partly-done checklists."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="demo")
        parser.add_argument("--password", default="demo-pass-123")

    @transaction.atomic
    def handle(self, *args, username, password, **options):
        user, created = User.objects.get_or_create(username=username)
        user.set_password(password)
        user.save()
        # Re-running replaces the demo user's projects rather than piling up duplicates.
        user.projects.all().delete()

        now = timezone.now()
        for spec in DEMO_PROJECTS:
            viewed = spec["viewed_days_ago"]
            project = Project.objects.create(
                owner=user,
                name=spec["name"],
                description=spec["description"],
                project_status=spec["status"],
                last_viewed_at=None if viewed is None else now - timedelta(days=viewed),
            )
            serializer = ProjectTreeSerializer(
                data=build_tree_payload(spec["pages"]), context={"project": project}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

            for page_name, sections in spec["pages"].items():
                for section, tasks in sections.items():
                    done = [title for title, is_done in tasks if is_done]
                    Task.objects.filter(
                        section__page__project=project,
                        section__page__name=page_name,
                        section__title=section,
                        title__in=done,
                    ).update(completed=True)

        self.stdout.write(
            self.style.SUCCESS(
                f"{'Created' if created else 'Refreshed'} demo user '{username}' "
                f"with {len(DEMO_PROJECTS)} projects. Log in with password: {password}"
            )
        )
