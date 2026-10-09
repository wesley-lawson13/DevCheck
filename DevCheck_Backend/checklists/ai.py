"""Claude-powered checklist drafting and project action plans.

Two entry points, both returning plain dicts the views can validate and store:

- ``draft_checklist``: pages with MVP/DEV/DEPLOY tasks plus an ordered plan of attack,
  used when a project is created with AI. Nothing is saved here.
- ``plan_for_project``: next steps and extension ideas for an existing project. It never
  creates tasks.

Generation takes roughly 15-40s. ``runserver`` has no request timeout, but gunicorn's
default is 30s, so raise ``--timeout`` before deploying this.
"""

import logging
import os
from typing import Literal

import anthropic
from django.conf import settings
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Opt in to server-side retry on a substitute model if a safety classifier declines.
FALLBACK_BETA = "server-side-fallback-2026-07-01"
MAX_OUTPUT_TOKENS = 16000


class AIUnavailable(Exception):
    """No API key is configured."""


class AIGenerationError(Exception):
    """Claude refused, errored, or returned nothing usable."""


class DraftPage(BaseModel):
    name: str = Field(description="Short page or screen name, e.g. 'Login'")
    mvp: list[str] = Field(description="Tasks for the smallest working version of this page")
    dev: list[str] = Field(description="Tasks for features, polish and tests")
    deploy: list[str] = Field(description="Tasks for shipping this page")


class PlanStep(BaseModel):
    title: str = Field(description="Short imperative step title")
    detail: str = Field(description="One or two sentences on how to approach it")
    stage: Literal["MVP", "DEV", "DEPLOY"]


class Suggestion(BaseModel):
    title: str
    detail: str


class ChecklistDraft(BaseModel):
    pages: list[DraftPage]
    steps: list[PlanStep]


class ProjectPlan(BaseModel):
    steps: list[PlanStep]
    suggestions: list[Suggestion]


SYSTEM_PROMPT = """\
You help solo developers plan web projects. The checklist has three stages:
- MVP: the smallest version that works end to end.
- DEV: remaining features, polish, error handling and tests.
- DEPLOY: hosting, environment variables and secrets, CI, monitoring, launch checks.

Write tasks that are short (under 80 characters), concrete and imperative, such as \
"Add JWT login endpoint". Do not number them or repeat the page name in every task. \
Plan steps are an ordered plan of attack for the whole project: each has a short title, \
one or two sentences of practical advice, and the stage it belongs to.\
"""


def _client():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise AIUnavailable("AI generation is not configured. Set ANTHROPIC_API_KEY.")
    return anthropic.Anthropic()


def _parse(user_prompt, output_format):
    """Run one structured-output request and return the validated Pydantic object."""
    client = _client()
    try:
        response = client.beta.messages.parse(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=MAX_OUTPUT_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
            thinking={"type": "adaptive"},
            output_config={"effort": "medium"},
            output_format=output_format,
            betas=[FALLBACK_BETA],
            fallbacks="default",
        )
    except anthropic.APIError as e:
        logger.exception("Claude request failed")
        raise AIGenerationError("The AI service failed. Try again in a moment.") from e

    if response.stop_reason == "refusal":
        raise AIGenerationError("The AI declined to generate a plan for this project.")
    if response.stop_reason == "max_tokens" or response.parsed_output is None:
        raise AIGenerationError("The AI response was incomplete. Try again.")
    return response.parsed_output


def _as_plan(steps, suggestions=()):
    return {
        "steps": [s.model_dump() for s in steps],
        "suggestions": [s.model_dump() for s in suggestions],
    }


def draft_checklist(name, description, link=None, page_names=()):
    """Draft pages (with tasks per stage) and a plan of attack for a new project."""
    lines = [f"Project: {name}", f"Description: {description}"]
    if link:
        lines.append(f"Link: {link}")
    if page_names:
        lines.append(
            "Fill in exactly these pages, in this order, and do not add others: "
            + ", ".join(page_names)
        )
    else:
        lines.append("Propose 3-6 pages or screens that cover the project.")
    lines.append(
        "Give each page 3-6 tasks per stage, and 5-8 plan steps for the project as a whole."
    )

    draft = _parse("\n".join(lines), ChecklistDraft)
    pages = [
        {
            "name": page.name,
            "tasks": {"MVP": page.mvp, "DEV": page.dev, "DEPLOY": page.deploy},
        }
        for page in draft.pages
    ]
    return {"pages": pages, "plan": _as_plan(draft.steps)}


def render_project(project):
    """Plain-text outline of a project, with done/open markers, for the prompt."""
    lines = [
        f"Project: {project.name}",
        f"Description: {project.description}",
        f"Current stage: {project.get_project_status_display()}",
    ]
    if project.link:
        lines.append(f"Link: {project.link}")
    for page in project.pages.all():
        lines.append(f"\nPage: {page.name}")
        for section in page.sections.all():
            lines.append(f"  {section.get_title_display()}:")
            for task in section.tasks.all():
                lines.append(f"    [{'x' if task.completed else ' '}] {task.title}")
    return "\n".join(lines)


def plan_for_project(project):
    """Next steps and extension ideas for an existing project. Never creates tasks."""
    prompt = (
        render_project(project)
        + "\n\nGive 5-8 ordered next steps that build on what is done and what is still "
        "open, then 3-5 suggestions for ways to extend the project beyond this checklist."
    )
    plan = _parse(prompt, ProjectPlan)
    return _as_plan(plan.steps, plan.suggestions)
