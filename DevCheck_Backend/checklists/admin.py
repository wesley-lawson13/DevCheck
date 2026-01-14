from django.contrib import admin
from .models import Project, Page, ChecklistSection, Task, Issue

# Register your models here.
admin.site.register(Project)
admin.site.register(Page)
admin.site.register(ChecklistSection)
admin.site.register(Task)
admin.site.register(Issue)