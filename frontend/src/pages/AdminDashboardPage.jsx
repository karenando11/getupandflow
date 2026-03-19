import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiClient } from "../api/client";
import { fetchAllPages, getErrorMessage, getListData, getPaginationMeta } from "../api/utils";
import { AdminUserManagementForm } from "../components/AdminUserManagementForm";
import { PaginationControls } from "../components/PaginationControls";

function getDisplayName(user) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
}

export function AdminDashboardPage() {
  const [coaches, setCoaches] = useState([]);
  const [coachRows, setCoachRows] = useState([]);
  const [clientRows, setClientRows] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [coachPage, setCoachPage] = useState(1);
  const [clientPage, setClientPage] = useState(1);
  const [coachTotalPages, setCoachTotalPages] = useState(0);
  const [clientTotalPages, setClientTotalPages] = useState(0);

  async function loadDashboard(nextCoachPage = coachPage, nextClientPage = clientPage) {
    setIsLoadingDashboard(true);
    setLoadErrorMessage("");
    try {
      const [coachPageResponse, clientPageResponse, allCoaches] = await Promise.all([
        apiClient.get("/admin/users/", { params: { role: "Coach", page: nextCoachPage } }),
        apiClient.get("/admin/users/", { params: { role: "Client", page: nextClientPage } }),
        fetchAllPages("/admin/users/", { params: { role: "Coach" } }),
      ]);
      setCoachRows(getListData(coachPageResponse.data));
      setClientRows(getListData(clientPageResponse.data));
      setCoaches(allCoaches);
      setCoachTotalPages(getPaginationMeta(coachPageResponse.data).totalPages);
      setClientTotalPages(getPaginationMeta(clientPageResponse.data).totalPages);
      setCoachPage(nextCoachPage);
      setClientPage(nextClientPage);
    } catch (error) {
      setCoachRows([]);
      setClientRows([]);
      setCoaches([]);
      setLoadErrorMessage(getErrorMessage(error, "We couldn't load the admin dashboard right now."));
    } finally {
      setIsLoadingDashboard(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleSubmit(formState) {
    setErrorMessage("");
    setIsSubmitting(true);

    const payload = {
      username: formState.username,
      first_name: formState.first_name,
      last_name: formState.last_name,
      email: formState.email,
      role: formState.role,
      phone_number: formState.phone_number,
    };

    if (formState.password) {
      payload.password = formState.password;
    }
    if (formState.role === "Client") {
      payload.assigned_coach_id = Number(formState.assigned_coach_id);
    }

    try {
      if (editingUser) {
        await apiClient.patch(`/admin/users/${editingUser.id}/`, payload);
      } else {
        await apiClient.post("/admin/users/", payload);
      }
      setEditingUser(null);
      await loadDashboard(1, 1);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to save user."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(user) {
    setErrorMessage("");
    try {
      await apiClient.delete(`/admin/users/${user.id}/`);
      if (editingUser?.id === user.id) {
        setEditingUser(null);
      }
      await loadDashboard(1, 1);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to delete user."));
    }
  }

  return (
    <main className="content-page admin-dashboard-page">
      <section className="content-card">
        <p className="eyebrow">Admin Dashboard</p>
        <h2>User and assignment management</h2>
        <p className="subtle-copy">
          Create, update, and remove coach/client users, and manage each client&apos;s assigned coach.
        </p>
        <Link className="task-create-button category-manage-link" to="/app">
          Back to app
        </Link>
        {loadErrorMessage ? <p className="form-error">{loadErrorMessage}</p> : null}

        <AdminUserManagementForm
          coaches={coaches}
          editingUser={editingUser}
          errorMessage={errorMessage}
          isLoadingCoaches={isLoadingDashboard}
          isSubmitting={isSubmitting}
          onCancel={() => setEditingUser(null)}
          onSubmit={handleSubmit}
        />

        <section className="admin-dashboard-grid">
          <div className="admin-list-card">
            <h3>Coaches</h3>
            {isLoadingDashboard ? <p className="subtle-copy">Loading coaches...</p> : null}
            <div className="admin-user-list">
              {coachRows.map((user) => (
                <article key={user.id} className="admin-user-item">
                  <div>
                    <strong>{getDisplayName(user)}</strong>
                    <p className="subtle-copy">{user.email || user.username}</p>
                  </div>
                  <div className="category-item-actions">
                    <button className="calendar-nav-button" onClick={() => setEditingUser(user)} type="button">
                      Edit
                    </button>
                    <button className="entity-form-close" onClick={() => handleDelete(user)} type="button">
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <PaginationControls
              currentPage={coachPage}
              isLoading={isLoadingDashboard}
              label="coaches"
              onPageChange={(page) => loadDashboard(page, clientPage)}
              totalPages={coachTotalPages}
            />
          </div>

          <div className="admin-list-card">
            <h3>Clients</h3>
            {isLoadingDashboard ? <p className="subtle-copy">Loading clients...</p> : null}
            <div className="admin-user-list">
              {clientRows.map((user) => {
                const assignedCoach = coaches.find((coach) => coach.id === user.assigned_coach_id);
                return (
                  <article key={user.id} className="admin-user-item">
                    <div>
                      <strong>{getDisplayName(user)}</strong>
                      <p className="subtle-copy">{user.email || user.username}</p>
                      <small className="subtle-copy">
                        Assigned coach: {assignedCoach ? getDisplayName(assignedCoach) : "Unassigned"}
                      </small>
                    </div>
                    <div className="category-item-actions">
                      <button className="calendar-nav-button" onClick={() => setEditingUser(user)} type="button">
                        Edit
                      </button>
                      <button className="entity-form-close" onClick={() => handleDelete(user)} type="button">
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <PaginationControls
              currentPage={clientPage}
              isLoading={isLoadingDashboard}
              label="clients"
              onPageChange={(page) => loadDashboard(coachPage, page)}
              totalPages={clientTotalPages}
            />
          </div>
        </section>
      </section>
    </main>
  );
}
