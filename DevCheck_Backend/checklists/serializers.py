from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import ChecklistSection, Issue, Page, Project, Task

DEFAULT_PROJECT_IMAGE_URL = (
    "https://res.cloudinary.com/dpodsvx94/image/upload/v1769448461/copyLogo_tni1wh.png"
)
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
        fields = ["id", "username", "password", "date_joined"]
        read_only_fields = ["id", "date_joined"]

    def validate(self, attrs):
        # Build an unsaved user so similarity validators can compare against the username.
        candidate = User(username=attrs.get("username"))
        try:
            password_validation.validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)}) from e
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    """Read-only view of the current user."""

    class Meta:
        model = User
        fields = ["id", "username", "date_joined"]
        read_only_fields = fields


class ChecklistTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = "__all__"
        read_only_fields = ["section"]


class ChecklistSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistSection
        fields = "__all__"
        extra_kwargs = {
            "page": {"read_only": True},
            "order": {"read_only": True},
        }

    def validate_title(self, value):
        # The (page, title) unique validator is skipped because `page` is read-only,
        # so enforce it here to return 400 instead of an IntegrityError 500.
        page = self.context.get("page") or getattr(self.instance, "page", None)
        if page is not None:
            clashes = page.sections.filter(title=value)
            if self.instance is not None:
                clashes = clashes.exclude(pk=self.instance.pk)
            if clashes.exists():
                raise serializers.ValidationError(
                    "This page already has a section with that title."
                )
        return value

    def create(self, validated_data):
        validated_data["order"] = ChecklistSection.SECTION_ORDER.get(validated_data.get("title"), 0)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "title" in validated_data:
            validated_data["order"] = ChecklistSection.SECTION_ORDER.get(
                validated_data["title"], instance.order
            )
        return super().update(instance, validated_data)


class ChecklistTaskNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ["id", "title", "completed"]


class ChecklistSectionNestedSerializer(serializers.ModelSerializer):
    tasks = ChecklistTaskNestedSerializer(many=True, read_only=True)

    class Meta:
        model = ChecklistSection
        fields = ["id", "title", "tasks"]


def create_default_sections(page):
    """Every page gets one MVP, one DEV and one DEPLOY section, in that order."""
    ChecklistSection.objects.bulk_create(
        ChecklistSection(page=page, title=title, order=order)
        for title, order in ChecklistSection.SECTION_ORDER.items()
    )


class PageSerializer(serializers.ModelSerializer):
    sections = ChecklistSectionNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Page
        fields = ["id", "project", "name", "order", "sections"]
        extra_kwargs = {
            "order": {"required": False},
            "project": {"read_only": True},
        }

    def create(self, validated_data):
        with transaction.atomic():
            page = super().create(validated_data)
            create_default_sections(page)
        return page


class ProjectSerializer(ProjectImageMixin, serializers.ModelSerializer):
    # Annotated by the list view's queryset; absent (and simply omitted from output) on a
    # freshly created instance, which is fine since the create response doesn't need them.
    task_total = serializers.IntegerField(read_only=True)
    task_completed = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = "__all__"
        extra_kwargs = {
            "owner": {"read_only": True},
        }


class PageNestedSerializer(serializers.ModelSerializer):
    sections = ChecklistSectionNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Page
        fields = ["id", "name", "sections"]


class ProjectDetailSerializer(ProjectImageMixin, serializers.ModelSerializer):
    pages = PageNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "link",
            "pages",
            "project_status",
            "image",
            "ai_plan",
        ]
        read_only_fields = ["ai_plan"]


class TreePageSerializer(serializers.Serializer):
    """One page within a tree-create payload: a name plus tasks grouped by section."""

    name = serializers.CharField(max_length=100)
    tasks = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField(max_length=200, allow_blank=False)),
        required=False,
        default=dict,
    )

    def validate_tasks(self, value):
        unknown = set(value) - set(ChecklistSection.SECTION_ORDER)
        if unknown:
            raise serializers.ValidationError(
                f"Unknown section(s): {', '.join(sorted(unknown))}. Use MVP, DEV or DEPLOY."
            )
        return value


class PlanStepSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    detail = serializers.CharField(max_length=1000, allow_blank=True)
    stage = serializers.ChoiceField(choices=list(ChecklistSection.SECTION_ORDER))


class PlanSuggestionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    detail = serializers.CharField(max_length=1000, allow_blank=True)


class PlanSerializer(serializers.Serializer):
    """An AI action plan: ordered steps plus optional ideas for extending the project."""

    steps = PlanStepSerializer(many=True, max_length=20)
    suggestions = PlanSuggestionSerializer(many=True, required=False, default=list, max_length=20)


def stamp_plan(plan):
    """Adds the metadata stored alongside a plan on Project.ai_plan."""
    return {**plan, "generated_at": timezone.now().isoformat(), "model": settings.ANTHROPIC_MODEL}


class ChecklistDraftRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(max_length=5000)
    link = serializers.URLField(required=False, allow_blank=True)
    pages = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False, default=list, max_length=10
    )
    context = serializers.CharField(max_length=8000, required=False, allow_blank=True, default="")


class ProjectTreeSerializer(serializers.Serializer):
    """Atomically creates one or more pages, each with its 3 sections and starter tasks.

    An optional AI `plan` is saved on the project in the same transaction.
    """

    pages = TreePageSerializer(many=True, allow_empty=False)
    plan = PlanSerializer(required=False)

    def create(self, validated_data):
        project = self.context["project"]
        pages = []
        with transaction.atomic():
            if "plan" in validated_data:
                project.ai_plan = stamp_plan(validated_data["plan"])
                project.save(update_fields=["ai_plan"])
            for page_data in validated_data["pages"]:
                page = Page.objects.create(project=project, name=page_data["name"])
                create_default_sections(page)
                sections_by_title = {s.title: s for s in page.sections.all()}
                for title, task_titles in page_data["tasks"].items():
                    section = sections_by_title[title]
                    Task.objects.bulk_create(
                        Task(section=section, title=t, order=i) for i, t in enumerate(task_titles)
                    )
                pages.append(page)
        return pages


class IssueSerializer(serializers.ModelSerializer):
    # PrimaryKeyRelatedField (not ReadOnlyField(source="user.id")) so a null user, left behind
    # when the reporting account is deleted, serializes as null instead of raising.
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Issue
        fields = ["description", "user", "date_submitted"]
