from django.contrib import admin

from .models import Event, EventCategory, Task


@admin.register(EventCategory)
class EventCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "client", "color", "created_at")
    search_fields = ("name", "client__username")


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "client_name", "event_date", "start_time", "end_time", "category")
    list_filter = ("event_date", "category")
    search_fields = ("title", "client_name", "location", "description")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "client", "deadline")
    list_filter = ("deadline",)
    search_fields = ("title", "description", "client__username")
