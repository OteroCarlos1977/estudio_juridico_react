import Swal from "sweetalert2";

export async function confirmDelete({ title, text }) {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#9a2c24",
    cancelButtonColor: "#4c5b70",
    reverseButtons: true,
  });

  return result.isConfirmed;
}

export function showSuccess(message) {
  return Swal.fire({
    title: message,
    icon: "success",
    timer: 1800,
    showConfirmButton: false,
  });
}

export function showError(message) {
  return Swal.fire({
    title: "No se pudo completar la operacion",
    text: message,
    icon: "error",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#2257a8",
  });
}
