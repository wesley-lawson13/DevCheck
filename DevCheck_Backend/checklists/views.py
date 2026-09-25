from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from .serializers import * 
from .models import Project, Page, ChecklistSection, Task, Issue

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

class UserDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

# will list all projects and allow the creation of new projects
class ProjectListCreate(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]    

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        return Project.objects.filter(owner=user)

    def perform_create(self, serializer):
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

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user).prefetch_related('pages__sections__tasks')

class ProjectViewedView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)

    def post(self, request, *args, **kwargs):
        project = self.get_object()
        project.last_viewed_at = timezone.now()
        project.save(update_fields=['last_viewed_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)

class PageListCreate(generics.ListCreateAPIView):
    serializer_class = PageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        project_id = self.kwargs['project_id']
        return Page.objects.filter(project__owner=self.request.user, project_id=project_id)

    def perform_create(self, serializer):
        project_id = self.kwargs['project_id']
        project = get_object_or_404(Project, id=project_id, owner=self.request.user)
        serializer.save(project=project)

class PageDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Page.objects.filter(project__owner=self.request.user)

class ProjectTreeCreateView(generics.GenericAPIView):
    """Atomically creates one or more pages (with sections and starter tasks) on a project."""

    serializer_class = ProjectTreeSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        project = get_object_or_404(Project, id=kwargs['pk'], owner=request.user)
        serializer = self.get_serializer(data=request.data, context={**self.get_serializer_context(), 'project': project})
        serializer.is_valid(raise_exception=True)
        pages = serializer.save()
        response_serializer = PageSerializer(pages, many=True, context=self.get_serializer_context())
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

class ChecklistSectionListCreate(generics.ListCreateAPIView):
    serializer_class = ChecklistSectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        page_id = self.kwargs['page_id']
        return ChecklistSection.objects.filter(page__project__owner=self.request.user, page_id=page_id)

    def get_page(self):
        if not hasattr(self, '_page'):
            self._page = get_object_or_404(
                Page, id=self.kwargs['page_id'], project__owner=self.request.user
            )
        return self._page

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method == 'POST':
            context['page'] = self.get_page()
        return context

    def perform_create(self, serializer):
        serializer.save(page=self.get_page())

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
        section = get_object_or_404(
            ChecklistSection, id=section_id, page__project__owner=self.request.user
        )
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
