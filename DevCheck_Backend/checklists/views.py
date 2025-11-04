from django.shortcuts import render
from django.contrib.auth.models import User

from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .serializers import UserSerializer, ProjectSerializer, PageSerializer, ChecklistSectionSerializer, ChecklistTaskSerializer
from .models import Project, Page, ChecklistSection, Task

@api_view(["GET"])
def hello(request):
    return Response({"message": "Hello from Django backend!"})

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

# will list all projects and allow the creation of new projects
class ProjectListCreate(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]    

    def get_queryset(self):
        user = self.request.user
        return Project.objects.filter(owner=user)

    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(owner=self.request.user)
        else:
            print(serializer.errors)

class ProjectDelete(generics.DestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]    

    def get_queryset(self):
        user = self.request.user
        return Project.objects.filter(owner=user)
