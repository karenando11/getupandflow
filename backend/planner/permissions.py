from accounts.constants import ROLE_ADMIN, ROLE_CLIENT, ROLE_COACH
from accounts.models import get_user_role


class RBACScope:
    @staticmethod
    def role_for(user):
        return get_user_role(user)

    @staticmethod
    def is_admin(user):
        return RBACScope.role_for(user) == ROLE_ADMIN

    @staticmethod
    def is_coach(user):
        return RBACScope.role_for(user) == ROLE_COACH

    @staticmethod
    def is_client(user):
        return RBACScope.role_for(user) == ROLE_CLIENT

    @staticmethod
    def can_access_client(user, client):
        if RBACScope.is_admin(user):
            return True
        if RBACScope.is_client(user):
            return user.id == client.id
        if RBACScope.is_coach(user):
            return client.profile.assigned_coach_id == user.id
        return False
