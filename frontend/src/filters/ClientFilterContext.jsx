import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiClient } from "../api/client";
import { fetchAllPages, getErrorMessage, getListData } from "../api/utils";
import { useAuth } from "../auth/AuthContext";

const ClientFilterContext = createContext(null);

const CLIENT_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#10b981",
  "#0ea5e9",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
];

function normalizeClient(profile) {
  const user = profile.user;
  return {
    id: user.id,
    label: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username,
    username: user.username,
  };
}

export function ClientFilterProvider({ children }) {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [clientError, setClientError] = useState("");
  const [eventError, setEventError] = useState("");

  const role = user?.role;
  const supportsClientFiltering = role === "Coach" || role === "Admin";

  async function loadEvents({ clientIds = selectedClientIds, filterEnabled = supportsClientFiltering } = {}) {
    setIsLoadingEvents(true);
    setEventError("");
    try {
      const params = {};
      if (filterEnabled) {
        params.client_ids = clientIds.join(",");
      }

      const response = await apiClient.get("/events/", { params });
      setEvents(getListData(response.data));
    } catch (error) {
      setEvents([]);
      setEventError(getErrorMessage(error, "We couldn't load calendar events right now."));
      throw error;
    } finally {
      setIsLoadingEvents(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadClients() {
      if (!supportsClientFiltering) {
        setClients([]);
        setSelectedClientIds([]);
        setHasInitializedSelection(false);
        return;
      }

      setIsLoadingClients(true);
      setClientError("");
      try {
        const assignments = await fetchAllPages("/client-assignments/");
        if (!isMounted) {
          return;
        }

        const nextClients = assignments.map(normalizeClient);
        setClients(nextClients);
        setSelectedClientIds((current) => {
          if (!hasInitializedSelection) {
            return nextClients.map((client) => client.id);
          }

          const allowedIds = new Set(nextClients.map((client) => client.id));
          return current.filter((id) => allowedIds.has(id));
        });
        setHasInitializedSelection(true);
      } catch (error) {
        if (isMounted) {
          setClients([]);
          setSelectedClientIds([]);
          setClientError(getErrorMessage(error, "We couldn't load the client filter list."));
        }
      } finally {
        if (isMounted) {
          setIsLoadingClients(false);
        }
      }
    }

    loadClients();

    return () => {
      isMounted = false;
    };
  }, [hasInitializedSelection, supportsClientFiltering]);

  useEffect(() => {
    let isMounted = true;

    if (supportsClientFiltering && hasInitializedSelection && selectedClientIds.length === 0) {
      setEvents([]);
      setIsLoadingEvents(false);
      return;
    }

    if (supportsClientFiltering && !hasInitializedSelection) {
      return;
    }

    loadEvents().catch(() => {
      if (isMounted) {
        setIsLoadingEvents(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [clients.length, hasInitializedSelection, selectedClientIds, supportsClientFiltering]);

  const colorMap = useMemo(() => {
    const entries = clients.map((client, index) => [client.id, CLIENT_COLORS[index % CLIENT_COLORS.length]]);
    return Object.fromEntries(entries);
  }, [clients]);

  const selectedClients = useMemo(
    () => clients.filter((client) => selectedClientIds.includes(client.id)),
    [clients, selectedClientIds],
  );

  const value = {
    clients,
    colorMap,
    clientError,
    eventError,
    events,
    isLoadingClients,
    isLoadingEvents,
    selectedClients,
    selectedClientIds,
    supportsClientFiltering,
    refreshEvents() {
      if (supportsClientFiltering && selectedClientIds.length === 0) {
        setEvents([]);
        setIsLoadingEvents(false);
        return Promise.resolve();
      }

      return loadEvents({
        clientIds: selectedClientIds,
        filterEnabled: supportsClientFiltering,
      });
    },
    toggleClient(clientId) {
      setSelectedClientIds((current) =>
        current.includes(clientId) ? current.filter((id) => id !== clientId) : [...current, clientId],
      );
    },
    isClientSelected(clientId) {
      return selectedClientIds.includes(clientId);
    },
  };

  return <ClientFilterContext.Provider value={value}>{children}</ClientFilterContext.Provider>;
}

export function useClientFilter() {
  const context = useContext(ClientFilterContext);
  if (!context) {
    throw new Error("useClientFilter must be used within a ClientFilterProvider");
  }
  return context;
}
