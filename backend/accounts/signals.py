from django.contrib.auth.models import Group, User
from django.db.models.signals import post_migrate, post_save
from django.dispatch import receiver

from .constants import ROLE_NAMES
from .models import UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_migrate)
def ensure_role_groups(sender, **kwargs):
    for role_name in ROLE_NAMES:
        Group.objects.get_or_create(name=role_name)
