from django.contrib.auth import password_validation
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Project, Page, ChecklistSection, Task, Issue

DEFAULT_PROJECT_IMAGE_URL = "https://res.cloudinary.com/dpodsvx94/image/upload/v1769448461/copyLogo_tni1wh.png"
MAX_IMAGE_BYTES = 10 * 1024 * 1024


class ProjectImageMixin:
    """Lets the model's ImageField handle uploads; reads return a full URL or the default logo."""

    def validate_image(self, image):
        if image is None:
            return image
        if image.size > MAX_IMAGE_BYTES:
            raise serializers.ValidationError("Image must be 10MB or smaller.")
        content_type = getattr(image, "content_type", None)
        if content_type and not content_type.startswith("image/"):
            raise serializers.ValidationError("Upload an image file.")
        return image

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not instance.image:
            data["image"] = DEFAULT_PROJECT_IMAGE_URL
            return data
        url = instance.image.url
        request = self.context.get("request")
        if request is not None and not url.startswith(("http://", "https://")):
            url = request.build_absolute_uri(url)
        data["image"] = url
        return data

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'date_joined']
        read_only_fields = ['id', 'date_joined']

    def validate(self, attrs):
        # Build an unsaved user so similarity validators can compare against the username.
        candidate = User(username=attrs.get("username"))
        try:
            password_validation.validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    """Read-only view of the current user."""

    class Meta:
        model = User
        fields = ['id', 'username', 'date_joined']
        read_only_fields = fields

class ChecklistTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ['section']

class ChecklistSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistSection
        fields = '__all__'
        extra_kwargs = {
            'page': {'read_only': True},
            'order': {'read_only': True},
        }

    def validate_title(self, value):
        # The (page, title) unique validator is skipped because `page` is read-only,
        # so enforce it here to return 400 instead of an IntegrityError 500.
        page = self.context.get('page') or getattr(self.instance, 'page', None)
        if page is not None:
            clashes = page.sections.filter(title=value)
            if self.instance is not None:
                clashes = clashes.exclude(pk=self.instance.pk)
            if clashes.exists():
                raise serializers.ValidationError("This page already has a section with that title.")
        return value

    def create(self, validated_data):
        validated_data['order'] = ChecklistSection.SECTION_ORDER.get(validated_data.get('title'), 0)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'title' in validated_data:
            validated_data['order'] = ChecklistSection.SECTION_ORDER.get(validated_data['title'], instance.order)
        return super().update(instance, validated_data)

class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = '__all__'
        extra_kwargs = {
            'order': {'required': False},
            'project': {'read_only': True} 
        }

class ProjectSerializer(ProjectImageMixin, serializers.ModelSerializer):
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


class ProjectDetailSerializer(ProjectImageMixin, serializers.ModelSerializer):
    pages = PageNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'link', 'pages', 'project_status', 'image']

class IssueSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.id")
    class Meta:
        model = Issue
        fields = ['description', 'user', 'date_submitted']
