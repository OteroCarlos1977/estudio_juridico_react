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

  if (form.telefono.trim() && !/^[+()0-9\s-]{6,30}$/.test(form.telefono.trim())) {
    errors.telefono = ["Telefono invalido. Use solo numeros, espacios, +, guiones o parentesis."];
  }

  if (form.dni_cuit.trim() && !/^[0-9-]{7,13}$/.test(form.dni_cuit.trim())) {
    errors.dni_cuit = ["DNI/CUIT invalido. Use solo numeros y guiones."];
  }

  return errors;
}

export function normalizeClientField(name, value) {
  if (["apellido", "nombre", "razon_social", "domicilio", "localidad", "provincia"].includes(name)) {
    return value.toUpperCase();
  }

  if (name === "email") {
    return value.trim().toLowerCase();
  }

  if (name === "dni_cuit") {
    return value.replace(/[^\d-]/g, "");
  }

  if (name === "telefono") {
    return value.replace(/[^+()\d\s-]/g, "");
  }

  if (name === "codigo_postal") {
    return value.toUpperCase().replace(/[^A-Z0-9\s-]/g, "");
  }

  return value;
}

export function normalizeClientPayload(form) {
  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, typeof value === "string" ? normalizeClientField(key, value).trim() : value])
  );
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
