type EscuchaComentario = (publicacionId: number) => void;

const escuchas = new Set<EscuchaComentario>();

export function escucharComentarios(escucha: EscuchaComentario) {
  escuchas.add(escucha);
  return () => {
    escuchas.delete(escucha);
  };
}

export function avisarComentarioCreado(publicacionId: number) {
  escuchas.forEach((escucha) => escucha(publicacionId));
}
