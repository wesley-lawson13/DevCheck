"""Query-count guards and measurements for the project detail (dashboard) endpoint.

The dashboard calls GET /projects/<id>/detail/ once per project. That response nests
pages -> sections -> tasks, which is an N+1 trap: without prefetch_related, every page
costs a sections query and every section a tasks query.

Run `pytest checklists/tests/test_query_counts.py -s` to print the comparison table.
"""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from checklists.models import ChecklistSection, Page, Project, Task
from checklists.serializers import ProjectDetailSerializer

SECTION_TITLES = ("MVP", "DEV", "DEPLOY")
TASKS_PER_SECTION = 5


def detail_url(project):
    return f"/checklists/projects/{project.id}/detail/"


def build_project(owner, pages, name="Bench"):
    """One project with `pages` pages, each with 3 sections of TASKS_PER_SECTION tasks."""
    project = Project.objects.create(owner=owner, name=name, description="d")
    for i in range(pages):
        page = Page.objects.create(project=project, name=f"Page {i}")
        for title in SECTION_TITLES:
            section = ChecklistSection.objects.create(page=page, title=title)
            Task.objects.bulk_create(
                Task(section=section, title=f"{title} task {n}") for n in range(TASKS_PER_SECTION)
            )
    return project


def count_endpoint_queries(client, project):
    with CaptureQueriesContext(connection) as ctx:
        res = client.get(detail_url(project))
    assert res.status_code == 200
    return len(ctx)


def count_naive_queries(project):
    """Serialize the same tree with no prefetch: what the endpoint would cost without it."""
    with CaptureQueriesContext(connection) as ctx:
        fresh = Project.objects.get(pk=project.pk)
        ProjectDetailSerializer(fresh).data
    return len(ctx)


@pytest.mark.parametrize("pages", [1, 5, 20])
def test_detail_query_count_does_not_grow_with_data(api_client, user, pages):
    """project + pages + sections + tasks = 4 queries, however large the tree is."""
    project = build_project(user, pages)
    with CaptureQueriesContext(connection) as ctx:
        res = api_client.get(detail_url(project))
    assert res.status_code == 200
    assert len(res.data["pages"]) == pages
    assert len(ctx) == 4, [q["sql"] for q in ctx.captured_queries]


def test_dashboard_load_query_count_scales_by_projects_not_tree_size(api_client, user):
    """The dashboard fetches one detail per project; each must stay at 4 queries."""
    projects = [build_project(user, pages=6, name=f"P{i}") for i in range(5)]
    total = sum(count_endpoint_queries(api_client, p) for p in projects)
    assert total == 4 * len(projects)


def test_report_n_plus_one_savings(api_client, user, capsys):
    rows = []
    for pages in (1, 4, 10, 20):
        project = build_project(user, pages, name=f"Report {pages}")
        tasks = pages * len(SECTION_TITLES) * TASKS_PER_SECTION
        naive = count_naive_queries(project)
        optimized = count_endpoint_queries(api_client, project)
        assert optimized < naive or pages == 0
        rows.append((pages, tasks, naive, optimized))

    lines = [
        "",
        "Queries per GET /projects/<id>/detail/",
        f"({len(SECTION_TITLES)} sections/page, {TASKS_PER_SECTION} tasks/section)",
        f"{'pages':>6} {'tasks':>6} {'no prefetch':>12} {'prefetch':>9} {'reduction':>10}",
    ]
    for pages, tasks, naive, optimized in rows:
        lines.append(
            f"{pages:>6} {tasks:>6} {naive:>12} {optimized:>9} {1 - optimized / naive:>10.0%}"
        )
    with capsys.disabled():
        print("\n".join(lines))


@pytest.mark.parametrize("projects", [1, 10, 30])
def test_project_list_query_count_does_not_grow_with_projects(api_client, user, projects):
    """The flat list serializer touches no relations: one query, however many projects."""
    for i in range(projects):
        build_project(user, pages=1, name=f"P{i}")
    with CaptureQueriesContext(connection) as ctx:
        res = api_client.get("/checklists/projects/")
    assert res.status_code == 200
    assert len(res.data if isinstance(res.data, list) else res.data["results"]) == projects
    assert len(ctx) == 1, [q["sql"] for q in ctx.captured_queries]
