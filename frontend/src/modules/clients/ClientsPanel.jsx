import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { ClientDetail } from "./ClientDetail";
import { ClientForm } from "./ClientForm";
import { ClientTable } from "./ClientTable";
import { clientToForm, emptyClientForm, formatClientName, validateClientForm } from "./clientUtils";

export function ClientsPanel() {
  const queryClient = useQueryClient();
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [editingClientId, setEditingClientId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientFormErrors, setClientFormErrors] = useState({});
  const [clientFormMessage, setClientFormMessage] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const response = await api.get("/clientes");
      return response.data.clients;
    },
    retry: 1,
  });

  const selectedClientQuery = useQuery({
    queryKey: ["client-detail", selectedClientId],
    queryFn: async () => {
      const response = await api.get(`/clientes/${selectedClientId}`);
      return response.data.client;
    },
    enabled: Boolean(selectedClientId),
    retry: 1,
  });

  const saveClientMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingClientId) {
        const response = await api.put(`/clientes/${editingClientId}`, payload);
        return response.data.client;
      }

      const response = await api.post("/clientes", payload);
      return response.data.client;
    },
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["client-detail", client.id] });
      setClientForm(emptyClientForm);
      setEditingClientId(null);
      setSelectedClientId(client.id);
      setClientFormErrors({});
      setClientFormMessage(`Cliente guardado: ${formatClientName(client)}`);
    },
    onError: (error) => {
      const response = error.response?.data;
      setClientFormErrors(response?.details?.fieldErrors || {});
      setClientFormMessage(response?.message || "No se pudo guardar el cliente.");
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId) => {
      await api.delete(`/clientes/${clientId}`);
      return clientId;
    },
    onSuccess: (clientId) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.removeQueries({ queryKey: ["client-detail", clientId] });
      if (editingClientId === clientId) {
        startNewClient();
      }
      if (selectedClientId === clientId) {
        setSelectedClientId(null);
      }
      setClientFormMessage("Cliente eliminado.");
    },
  });

  function handleClientFieldChange(event) {
    const { name, value } = event.target;
    setClientForm((current) => ({ ...current, [name]: value }));
    setClientFormErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleClientSubmit(event) {
    event.preventDefault();
    setClientFormMessage("");

    const validationErrors = validateClientForm(clientForm);
    setClientFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setClientFormMessage("Revisa los campos marcados antes de guardar.");
      return;
    }

    saveClientMutation.mutate(clientForm);
  }

  function startNewClient() {
    setClientForm(emptyClientForm);
    setEditingClientId(null);
    setClientFormErrors({});
    setClientFormMessage("");
  }

  async function startEditingClient(clientId) {
    setClientFormMessage("");
    setClientFormErrors({});

    try {
      const response = await api.get(`/clientes/${clientId}`);
      const client = response.data.client;
      setEditingClientId(client.id);
      setSelectedClientId(client.id);
      setClientForm(clientToForm(client));
    } catch (error) {
      setClientFormMessage(error.response?.data?.message || "No se pudo cargar el cliente.");
    }
  }

  function confirmDeleteClient(client) {
    const name = formatClientName(client);
    if (window.confirm(`Eliminar cliente "${name}"? Esta accion lo ocultara del listado activo.`)) {
      deleteClientMutation.mutate(client.id);
    }
  }

  return (
    <>
      <ClientForm
        form={clientForm}
        errors={clientFormErrors}
        isEditing={Boolean(editingClientId)}
        isSaving={saveClientMutation.isPending}
        message={clientFormMessage}
        isError={saveClientMutation.isError}
        onChange={handleClientFieldChange}
        onSubmit={handleClientSubmit}
        onReset={startNewClient}
      />
      <ClientDetail client={selectedClientQuery.data} />
      <ClientTable
        clients={clientsQuery.data || []}
        search={clientSearch}
        selectedClientId={selectedClientId}
        onSearchChange={setClientSearch}
        onEdit={startEditingClient}
        onView={setSelectedClientId}
        onDelete={confirmDeleteClient}
      />
    </>
  );
}
