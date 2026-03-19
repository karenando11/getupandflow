from django.contrib.auth.models import Group, User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .constants import ROLE_CLIENT, ROLE_COACH


class AuthenticationFlowTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.coach_group = Group.objects.get(name=ROLE_COACH)
        cls.client_group = Group.objects.get(name=ROLE_CLIENT)

        cls.coach = User.objects.create_user(
            username="coach1",
            password="Pass12345!",
            email="coach@example.com",
            first_name="Casey",
        )
        cls.coach.groups.add(cls.coach_group)

        cls.client_user = User.objects.create_user(
            username="client1",
            password="Pass12345!",
            email="client@example.com",
            first_name="Jordan",
        )
        cls.client_user.groups.add(cls.client_group)
        cls.client_user.profile.assigned_coach = cls.coach
        cls.client_user.profile.save()

    def test_valid_login_issues_tokens_and_user_payload(self):
        response = self.client.post(
            reverse("login"),
            {"username": "client1", "password": "Pass12345!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["role"], ROLE_CLIENT)

    def test_invalid_login_is_rejected(self):
        response = self.client.post(
            reverse("login"),
            {"username": "client1", "password": "wrong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_identifies_user_role_and_assigned_coach(self):
        login_response = self.client.post(
            reverse("login"),
            {"username": "client1", "password": "Pass12345!"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], ROLE_CLIENT)
        self.assertEqual(response.data["profile"]["assigned_coach_name"], "Casey")
