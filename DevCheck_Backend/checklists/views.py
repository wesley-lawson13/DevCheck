from django.utils import timezone
from django.shortcuts import render
from django.contrib.auth.models import User

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import * 
from .models import Project, Page, ChecklistSection, Task, Issue

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class UserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

# will list all projects and allow the creation of new projects
class ProjectListCreate(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]    

    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        return Project.objects.filter(owner=user)

    def perform_create(self, serializer):
        print(self.request.FILES)
        serializer.save(owner=self.request.user)

class ProjectDelete(generics.DestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]    

    def get_queryset(self):
        user = self.request.user
        return Project.objects.filter(owner=user)

class ProjectDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ProjectDetailSerializer
    permission_classes = [IsAuthenticated]

    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user).prefetch_related('pages__sections__tasks')

    def get_object(self):
        project = super().get_object()
        if self.request.method == "GET" and not self.request.query_params.get('dashboard'):
            project.updated_at = timezone.now()
            project.save(update_fields=['updated_at'])
        return project

class PageListCreate(generics.ListCreateAPIView):
    serializer_class = PageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        project_id = self.kwargs['project_id']
        return Page.objects.filter(project__owner=self.request.user, project_id=project_id)

    def perform_create(self, serializer):
        project_id = self.kwargs['project_id']
        project = Project.objects.get(id=project_id, owner=self.request.user)
        serializer.save(project=project)

class PageDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Page.objects.filter(project__owner=self.request.user)

class ChecklistSectionListCreate(generics.ListCreateAPIView):
    serializer_class = ChecklistSectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        page_id = self.kwargs['page_id']
        return ChecklistSection.objects.filter(page__project__owner=self.request.user, page_id=page_id)

    def perform_create(self, serializer):
        page_id = self.kwargs['page_id']
        page = Page.objects.get(id=page_id, project__owner=self.request.user)
        serializer.save(page=page)

class ChecklistSectionDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChecklistSectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChecklistSection.objects.filter(page__project__owner=self.request.user)

class TaskListCreate(generics.ListCreateAPIView):
    serializer_class = ChecklistTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        section_id = self.kwargs['section_id']
        return Task.objects.filter(section__page__project__owner=self.request.user, section_id=section_id)

    def perform_create(self, serializer):
        section_id = self.kwargs['section_id']
        section = ChecklistSection.objects.get(id=section_id, page__project__owner=self.request.user)
        serializer.save(section=section)

class TaskDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChecklistTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(section__page__project__owner=self.request.user)

class CreateIssueView(generics.CreateAPIView):
    queryset = Issue.objects.all()
    serializer_class = IssueSerializer 
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
