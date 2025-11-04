from django.db import models
from django.contrib.auth.models import User

class Project(models.Model):
    """A project groups related website pages together."""
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    link = models.URLField(blank=True, null=True)
    image = models.ImageField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Page(models.Model):
    """Each page belongs to a project and has its own checklists."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="pages")
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.project.name} - {self.name}"


class ChecklistSection(models.Model):
    """Sections organize tasks by development stage."""
    SECTION_CHOICES = [
        ("MVP", "MVP"),
        ("DEV", "In Development"),
        ("DEPLOY", "In Deployment"),
    ]
    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="sections")
    title = models.CharField(max_length=20, choices=SECTION_CHOICES)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("page", "title")  # One section of each type per page

    def __str__(self):
        return f"{self.page.name} - {self.get_title_display()}"


class Task(models.Model):
    """Individual tasks within a checklist section."""
    section = models.ForeignKey(ChecklistSection, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    completed = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({'done' if self.completed else 'pending'})"
