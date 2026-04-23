import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal } from "react-bootstrap";
import { api } from "../../api/client";
import { confirmDelete, showError, showSuccess } from "../../ui/alerts";
import { ClientDetail } from "./ClientDetail";
import { ClientForm } from "./ClientForm";
import { ClientTable } from "./ClientTable";
import { clientToForm, emptyClientForm, formatClientName, normalizeClientField, normalizeClientPayload, validateClientForm } from "./clientUtils";

export function ClientsPanel() {
  const queryClient = useQueryClient();
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [editingClientId, setEditingClientId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientFormErrors, setClientFormErrors] = useState({});
  const [clientFormMessage, setClientFormMessage] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

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
      setIsClientModalOpen(false);
      setClientFormErrors({});
      setClientFormMessage(`Cliente guardado: ${formatClientName(client)}`);
      showSuccess(`Cliente guardado: ${formatClientName(client)}`);
    },
    onError: (error) => {
      const response = error.response?.data;
      setClientFormErrors(response?.details?.fieldErrors || {});
      setClientFormMessage(response?.message || "No se pudo guardar el cliente.");
      showError(response?.message || "No se pudo guardar el cliente.");
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
        closeClientModal();
      }
      if (selectedClientId === clientId) {
        setSelectedClientId(null);
      }
      setClientFormMessage("Cliente eliminado.");
      showSuccess("Cliente eliminado.");
    },
  });

  function handleClientFieldChange(event) {
    const { name, value } = event.target;
    setClientForm((current) => ({ ...current, [name]: normalizeClientField(name, value) }));
    setClientFormErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleClientSubmit(event) {
    event.preventDefault();
    setClientFormMessage("");

    const normalizedForm = normalizeClientPayload(clientForm);
    const validationErrors = validateClientForm(normalizedForm);
    setClientFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setClientFormMessage("Revisa los campos marcados antes de guardar.");
      return;
    }

    setClientForm(normalizedForm);
    saveClientMutation.mutate(normalizedForm);
  }

  function startNewClient() {
    setClientForm(emptyClientForm);
    setEditingClientId(null);
    setClientFormErrors({});
    setClientFormMessage("");
    setIsClientModalOpen(true);
  }

  function closeClientModal() {
    setIsClientModalOpen(false);
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
      setIsClientModalOpen(true);
    } catch (error) {
      setClientFormMessage(error.response?.data?.message || "No se pudo cargar el cliente.");
    }
  }

  async function confirmDeleteClient(client) {
    const name = formatClientName(client);
    const confirmed = await confirmDelete({
      title: `Eliminar cliente "${name}"?`,
      text: "Esta accion lo ocultara del listado activo.",
    });

    if (confirmed) {
      deleteClientMutation.mutate(client.id);
    }
  }

  return (
    <>
      {clientFormMessage && !isClientModalOpen && (
        <div className={saveClientMutation.isError ? "notice error" : "notice success"}>
          {clientFormMessage}
        </div>
      )}

      <ClientDetail client={selectedClientQuery.data} onClose={() => setSelectedClientId(null)} />
      <ClientTable
        clients={clientsQuery.data || []}
        search={clientSearch}
        selectedClientId={selectedClientId}
        isLoading={clientsQuery.isLoading}
        isError={clientsQuery.isError}
        onSearchChange={setClientSearch}
        onCreate={startNewClient}
        onEdit={startEditingClient}
        onView={setSelectedClientId}
        onDelete={confirmDeleteClient}
      />

      {isClientModalOpen && (
        <Modal show onHide={closeClientModal} centered size="xl" aria-labelledby="client-modal-title">
          <Modal.Body>
            <ClientForm
              form={clientForm}
              errors={clientFormErrors}
              isEditing={Boolean(editingClientId)}
              isSaving={saveClientMutation.isPending}
              message={clientFormMessage}
              isError={saveClientMutation.isError}
              showNewButton={false}
              surface="modal"
              titleId="client-modal-title"
              onChange={handleClientFieldChange}
              onSubmit={handleClientSubmit}
              onReset={startNewClient}
            />
            <div className="form-actions modal-actions">
              <Button variant="outline-secondary" type="button" onClick={closeClientModal}>
                Cancelar
              </Button>
            </div>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
}
