from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Project, Page, ChecklistSection, Task

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'password'] # fields to be serialized on input / return 
        extra_kwargs = {"password": {"write_only": True}} # don't return password on GET requests

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class ChecklistTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'

class ChecklistSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistSection
        fields = '__all__'

class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'
        extra_kwargs = {
            'owner': {'read_only': True},
        }

class ChecklistTaskNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'completed']


class ChecklistSectionNestedSerializer(serializers.ModelSerializer):
    tasks = ChecklistTaskNestedSerializer(many=True, read_only=True)

    class Meta:
        model = ChecklistSection
        fields = ['id', 'title', 'tasks']


class PageNestedSerializer(serializers.ModelSerializer):
    sections = ChecklistSectionNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Page
        fields = ['id', 'name', 'sections']


class ProjectDetailSerializer(serializers.ModelSerializer):
    pages = PageNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'link', 'pages']
