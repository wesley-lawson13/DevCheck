from django.urls import path
from .import views 

urlpatterns = [

    # PROJECTS
    path('projects/', views.ProjectListCreate.as_view(), name='project-list'),
    path('projects/delete/<int:pk>/', views.ProjectDelete.as_view(), name='project-delete'),
    path('projects/<int:pk>/detail/', views.ProjectDetailView.as_view(), name='project-detail'),

    # PAGES
    path('projects/<int:project_id>/pages/', views.PageListCreate.as_view(), name='page-list-create'),
    path('pages/<int:pk>/', views.PageDetail.as_view(), name='page-detail'),

    # SECTIONS
    path('projects/<int:page_id>/sections/', views.ChecklistSectionListCreate.as_view(), name='section-list-create'),
    path('sections/<int:pk>/', views.ChecklistSectionDetail.as_view(), name='section-detail'),

    # TASKS
    path('projects/<int:section_id>/tasks/', views.TaskListCreate.as_view(), name='task-list-create'),
    path('tasks/<int:pk>/', views.TaskDetail.as_view(), name='task-detail'),

    # ISSUES / COMPLAINTS
    path('issues/', views.CreateIssueView.as_view(), name='create-issue'),
]