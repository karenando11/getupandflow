from django.contrib.auth.models import User
from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.constants import ROLE_ADMIN, ROLE_CLIENT, ROLE_COACH
from accounts.models import UserProfile

from .models import Event, EventCategory, Task
from .pagination import StandardResultsSetPagination
from .permissions import RBACScope
from .serializers import (
    AdminManagedUserSerializer,
    AnalyticsSummarySerializer,
    ClientAssignmentSerializer,
    EventCategorySerializer,
    EventSerializer,
    TaskSerializer,
    UserSummarySerializer,
)


class AdminOrReadOnlyForAuthenticated(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and RBACScope.is_admin(request.user)


class AdminOnlyPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and RBACScope.is_admin(request.user)


class ClientCategoryPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and RBACScope.is_client(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return RBACScope.is_client(request.user) and obj.client_id == request.user.id


class RoleScopedQuerysetMixin:
    client_field = "client"

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        role = RBACScope.role_for(user)

        if role == ROLE_ADMIN:
            return queryset
        if role == ROLE_CLIENT:
            return queryset.filter(**{self.client_field: user})
        if role == ROLE_COACH:
            return queryset.filter(**{f"{self.client_field}__profile__assigned_coach": user})
        return queryset.none()


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSummarySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        user = self.request.user
        role = RBACScope.role_for(user)

        if role == ROLE_ADMIN:
            queryset = User.objects.all().order_by("username")
            raw_role = self.request.query_params.get("role")
            if raw_role in {ROLE_ADMIN, ROLE_COACH, ROLE_CLIENT}:
                queryset = queryset.filter(groups__name=raw_role)
            return queryset
        if role == ROLE_COACH:
            return User.objects.filter(profile__assigned_coach=user).order_by("username")
        if role == ROLE_CLIENT:
            return User.objects.filter(id=user.id)
        return User.objects.none()


class ClientAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ClientAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        user = self.request.user
        role = RBACScope.role_for(user)
        queryset = UserProfile.objects.select_related("user", "assigned_coach").order_by("user__username")

        if role == ROLE_ADMIN:
            return queryset.filter(user__groups__name=ROLE_CLIENT)
        if role == ROLE_COACH:
            return queryset.filter(user__groups__name=ROLE_CLIENT, assigned_coach=user)
        if role == ROLE_CLIENT:
            return queryset.filter(user=user)
        return queryset.none()


class EventCategoryViewSet(viewsets.ModelViewSet):
    queryset = EventCategory.objects.select_related("client").order_by("name", "id")
    serializer_class = EventCategorySerializer
    permission_classes = [ClientCategoryPermission]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if RBACScope.is_admin(user):
            queryset = queryset
        elif RBACScope.is_coach(user):
            queryset = queryset.filter(client__profile__assigned_coach=user)
        elif RBACScope.is_client(user):
            queryset = queryset.filter(client=user)
        else:
            return queryset.none()

        raw_client_id = self.request.query_params.get("client_id")
        if raw_client_id and raw_client_id.isdigit():
            queryset = queryset.filter(client_id=int(raw_client_id))
        return queryset

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)


class EventViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Event.objects.select_related("client", "client__profile", "category").all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        raw_client_ids = self.request.query_params.get("client_ids")
        if not raw_client_ids:
            return queryset

        client_ids = []
        for value in raw_client_ids.split(","):
            value = value.strip()
            if value.isdigit():
                client_ids.append(int(value))

        if not client_ids:
            return queryset.none()

        return queryset.filter(client_id__in=client_ids)


class TaskViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Task.objects.select_related("client", "client__profile").order_by("deadline", "id")
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination


class AdminManagedUserViewSet(viewsets.ModelViewSet):
    serializer_class = AdminManagedUserSerializer
    permission_classes = [AdminOnlyPermission]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = User.objects.select_related("profile").filter(
            groups__name__in=[ROLE_COACH, ROLE_CLIENT]
        ).order_by("username").distinct()
        raw_role = self.request.query_params.get("role")
        if raw_role in {ROLE_COACH, ROLE_CLIENT}:
            queryset = queryset.filter(groups__name=raw_role)
        return queryset

    def perform_destroy(self, instance):
        if instance.groups.filter(name=ROLE_COACH).exists() and instance.coached_clients.exists():
            raise ValidationError({"assigned_coach_id": "Reassign this coach's clients before deleting the coach."})
        instance.delete()


class AdminAnalyticsView(APIView):
    permission_classes = [AdminOnlyPermission]

    def get(self, request):
        now = timezone.now()
        task_completion_rows = (
            Task.objects.filter(client__groups__name=ROLE_CLIENT)
            .values("client_id")
            .annotate(client_name=F("client__username"))
            .annotate(
                total_tasks=Count("id"),
                completed_tasks=Count("id", filter=Q(completed_at__isnull=False)),
                completed_on_time=Count("id", filter=Q(completed_at__isnull=False, completed_at__lte=F("deadline"))),
                overdue_open_tasks=Count("id", filter=Q(completed_at__isnull=True, deadline__lt=now)),
            )
            .order_by("client_name")
        )
        events_per_day_map = {}
        events_per_month_map = {}
        for event_date in Event.objects.values_list("event_date", flat=True):
            day_key = event_date.isoformat()
            month_key = event_date.strftime("%Y-%m")
            events_per_day_map[day_key] = events_per_day_map.get(day_key, 0) + 1
            events_per_month_map[month_key] = events_per_month_map.get(month_key, 0) + 1

        serializer = AnalyticsSummarySerializer(
            {
                "task_completion": [
                    {
                        **row,
                        "completion_rate": round((row["completed_on_time"] / row["total_tasks"]) * 100, 1)
                        if row["total_tasks"]
                        else 0,
                    }
                    for row in task_completion_rows
                ],
                "events_per_day": [
                    {"date": key, "count": events_per_day_map[key]}
                    for key in sorted(events_per_day_map.keys())
                ],
                "events_per_month": [
                    {"month": key, "count": events_per_month_map[key]}
                    for key in sorted(events_per_month_map.keys())
                ],
            }
        )
        return Response(serializer.data)
