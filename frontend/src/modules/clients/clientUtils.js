export const emptyClientForm = {
  tipo_persona: "fisica",
  apellido: "",
  nombre: "",
  razon_social: "",
  dni_cuit: "",
  telefono: "",
  email: "",
  domicilio: "",
  localidad: "",
  provincia: "",
  codigo_postal: "",
  observaciones: "",
};

export function formatClientName(client) {
  if (client.razon_social) {
    return client.razon_social;
  }

  return [client.apellido, client.nombre].filter(Boolean).join(", ") || `Cliente ${client.id}`;
}

export function formatLocation(client) {
  return [client.localidad, client.provincia].filter(Boolean).join(", ") || "-";
}

export function validateClientForm(form) {
  const errors = {};

  if (form.tipo_persona === "fisica" && !form.apellido.trim() && !form.nombre.trim()) {
    errors.apellido = ["Debe cargar apellido o nombre para personas fisicas."];
  }

  if (form.tipo_persona === "juridica" && !form.razon_social.trim()) {
    errors.razon_social = ["La razon social es obligatoria para personas juridicas."];
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = ["Email invalido."];
  }

  return errors;
}

export function clientToForm(client) {
  return {
    tipo_persona: client.tipo_persona || "fisica",
    apellido: client.apellido || "",
    nombre: client.nombre || "",
    razon_social: client.razon_social || "",
    dni_cuit: client.dni_cuit || "",
    telefono: client.telefono || "",
    email: client.email || "",
    domicilio: client.domicilio || "",
    localidad: client.localidad || "",
    provincia: client.provincia || "",
    codigo_postal: client.codigo_postal || "",
    observaciones: client.observaciones || "",
  };
}
