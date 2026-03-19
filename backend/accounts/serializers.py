from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import UserProfile, get_user_role


class UserProfileSerializer(serializers.ModelSerializer):
    assigned_coach_id = serializers.IntegerField(source="assigned_coach.id", read_only=True)
    assigned_coach_name = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ["phone_number", "assigned_coach_id", "assigned_coach_name"]

    def get_assigned_coach_name(self, obj) -> str | None:
        if not obj.assigned_coach:
            return None
        return obj.assigned_coach.get_full_name() or obj.assigned_coach.username


class CurrentUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "role", "profile"]

    def get_role(self, obj) -> str | None:
        return get_user_role(obj)


class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = get_user_role(user)
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = CurrentUserSerializer(self.user).data
        return data
