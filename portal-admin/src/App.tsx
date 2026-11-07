import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createHashRouter, RouterProvider, useLocation, useNavigate } from "react-router";
import logo from "./logo.webp";
import { cerrarSesion, escucharCierreDeSesion, iniciales, ingresarAdministrador, restaurarSesion, type Administrador } from "./lib/auth";
import { listarAsistentes, type Asistente } from "./lib/asistencias";
import { eliminarComentario, listarComentarios, type Comentario } from "./lib/comentarios";
import { buscarOracionPorFecha, diaSemanaIso, diasDeLaSemana, esFechaValida, fechaDeHoyEnBogota, guardarOracionEnVivo, HORA_PREDETERMINADA, LARGO_MAXIMO_TITULO, listarOficiosDeLaSemana, listarOracionesEnVivo, lunesDeLaSemana, MENSAJES_ORACION_EN_VIVO, sumarDias, tieneErrores, tituloSugerido, validarOracionEnVivo, type DatosOracionEnVivo, type ErroresOracionEnVivo, type OracionEnVivo } from "./lib/oracion-en-vivo";
import { CONTENIDOS_POR_PAGINA, IMAGENES_POR_PAGINA, listarContenidos, listarOracionesBiblioteca, type ContenidoBiblioteca, type FormatoContenido, type OracionBiblioteca, type PaginaContenidos, type SeccionBiblioteca } from "./lib/biblioteca";
import { crearPublicacion, editarPublicacion, eliminarPublicacion, listarPublicaciones, MAXIMO_IMAGENES, MENSAJES_PUBLICACION, urlImagen, validarImagen, type Publicacion } from "./lib/publicaciones";

type Section =
  | "Resumen"
  | "Publicaciones"
  | "Oración en vivo"
  | "Biblioteca"
  | "Calendario"
  | "Usuarios"
  | "Donaciones"
  | "Tienda"
  | "Pedidos";

const sections: { name: Section; icon: string }[] = [
  { name: "Resumen", icon: "grid" },
  { name: "Publicaciones", icon: "edit" },
  { name: "Oración en vivo", icon: "video" },
  { name: "Biblioteca", icon: "book" },
  { name: "Calendario", icon: "calendar" },
  { name: "Usuarios", icon: "users" },
  { name: "Tienda", icon: "store" },
  { name: "Pedidos", icon: "bag" },
  { name: "Donaciones", icon: "gift" },
];

const paths: Record<string, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4z"/></>,
  video: <><rect x="3" y="5" width="15" height="14" rx="3"/><path d="M18 10l4-2v8l-4-2z"/></>,
  book: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5z"/><path d="M4 5.5v14"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 00-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8z"/>,
  star: <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1z"/>,
  users: <><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></>,
  gift: <><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18M7.5 8C4 8 4 3 7 3c2 0 5 5 5 5s3-5 5-5c3 0 3 5-.5 5"/></>,
  library: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5z"/><path d="M8 7h8M8 11h6"/></>,
  store: <><path d="M3 9.5L4.8 3h14.4L21 9.5"/><path d="M3 9.5a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0"/><path d="M4.5 12.3V21h15v-8.7"/><path d="M9.5 21v-5.5h5V21"/></>,
  bag: <><path d="M6 8h12l2 13H4z"/><path d="M9 10V6a3 3 0 016 0v4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  chevron: <path d="M9 18l6-6-6-6"/>,
  close: <path d="M18 6L6 18M6 6l12 12"/>,
  check: <path d="M20 6L9 17l-5-5"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  arrow: <path d="M19 12H5M12 19l-7-7 7-7"/>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  trash: <><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></>,
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function Button({ children, variant = "primary", icon, onClick, type = "button", disabled = false }: { children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  return <button type={type} className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>{icon && <Icon name={icon} size={17}/>} {children}</button>;
}

function Input({ label, placeholder, type = "text", value, onChange, error }: { label?: string; placeholder?: string; type?: string; value?: string; onChange?: (v: string) => void; error?: string }) {
  return <label className="field">{label && <span>{label}</span>}<input type={type} placeholder={placeholder} value={value} onChange={e => onChange?.(e.target.value)}/>{error && <small>{error}</small>}</label>;
}

function Select({ label, value, onChange, children }: { label?: string; value?: string; onChange?: (v: string) => void; children: ReactNode }) {
  return <label className="field">{label && <span>{label}</span>}<select value={value} onChange={e => onChange?.(e.target.value)}>{children}</select></label>;
}

function Badge({ children, tone = "info" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <span className={`badge badge-${tone}`}><i/>{children}</span>;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function PageHead({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow">Administración</div><div className="page-title">{title}</div><div className="page-subtitle">{subtitle}</div></div>{action}</div>;
}

function Modal({ title, children, onClose, action = "Confirmar", danger = false, onConfirm }: { title: string; children: ReactNode; onClose: () => void; action?: string; danger?: boolean; onConfirm?: () => void | boolean }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-top"><div className="modal-title">{title}</div><button className="icon-btn" onClick={onClose}><Icon name="close"/></button></div><div className="modal-content">{children}</div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Volver</Button><Button variant={danger ? "danger" : "primary"} onClick={() => { if (onConfirm?.() === false) return; onClose(); }}>{action}</Button></div></div></div>;
}

function Toast({ text }: { text: string }) {
  return <div className="toast"><span><Icon name="check" size={16}/></span>{text}</div>;
}

function Login({ onLogin }: { onLogin: (administrador: Administrador) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    const resultado = await ingresarAdministrador(email, password);
    setLoading(false);
    if (resultado.estado === "ok") onLogin(resultado.administrador);
    else setError(resultado.mensaje);
  };
  return <main className="login-shell">
    <section className="login-brand">
      <img className="logo-large" src={logo} alt="Escuela de los Sagrados Corazones"/>
      <div className="brand-kicker">Escuela de los Sagrados Corazones</div>
      <div className="login-quote">“Sagrado Corazón de Jesús,<br/>en vos confío.”</div>
      <div className="brand-foot">Sagrados Corazones de Jesús y de María</div>
    </section>
    <section className="login-panel">
      <form className="login-form" onSubmit={submit}>
        <div className="mobile-logo"><img src={logo} alt="Escuela de los Sagrados Corazones"/></div>
        <div className="eyebrow">Portal administrador</div>
        <div className="login-title">Bienvenido de nuevo</div>
        <p>Ingresa tus credenciales para gestionar el contenido de la comunidad.</p>
        {error && <div className="error-banner"><span>!</span>{error}</div>}
        <Input label="Correo electrónico" type="email" placeholder="nombre@correo.com" value={email} onChange={setEmail}/>
        <Input label="Contraseña" type="password" placeholder="Ingresa tu contraseña" value={password} onChange={setPassword}/>
        <Button type="submit" disabled={loading}>{loading ? "Ingresando…" : <>Ingresar al portal <Icon name="chevron" size={17}/></>}</Button>
      </form>
    </section>
  </main>;
}

const prayers = [
  ["Oración de la Noche", "1.842 consultas", "12%"],
  ["Santo Rosario de Hoy", "1.536 consultas", "9%"],
  ["Divina Cita", "1.204 consultas", "7%"],
  ["Evangelio de Hoy", "986 consultas", "5%"],
  ["Hora de reparación", "742 consultas", "3%"],
];

function Summary() {
  const [period, setPeriod] = useState("Este mes");
  const [empty, setEmpty] = useState(false);
  const stats = [
    ["Usuarios registrados", empty ? "0" : "2.486", "users", "+8,2%"],
    ["Usuarios activos", empty ? "0" : "1.924", "heart", "+5,4%"],
    ["Donaciones del mes", empty ? "$0" : "$12.480.000", "gift", "+12,6%"],
    ["Asistencia confirmada", empty ? "0" : "368", "calendar", "+3,8%"],
  ];
  return <><PageHead title="Resumen" subtitle="Una mirada a la actividad de tu comunidad." action={<div className="head-actions"><Button variant="ghost" onClick={() => setEmpty(!empty)}>{empty ? "Ver con datos" : "Ver sin datos"}</Button><Select value={period} onChange={setPeriod}><option>Este mes</option><option>Mes anterior</option><option>Últimos 3 meses</option></Select></div>}/>
    <div className="stat-grid">{stats.map((s, i) => <Card className={`stat stat-${i}`} key={s[0]}><div className="stat-top"><span className="stat-icon"><Icon name={s[2]}/></span><span className="trend">{s[3]}</span></div><div className="stat-value">{s[1]}</div><div className="stat-label">{s[0]}</div><div className="stat-foot">vs. periodo anterior</div></Card>)}</div>
    <div className="dashboard-grid">
      <Card><div className="card-head"><div><div className="card-title">Oraciones más consultadas</div><div className="muted">Preferencias de la comunidad · {period.toLowerCase()}</div></div><button className="icon-btn"><Icon name="more"/></button></div>
        {empty ? <Empty title="Aún no hay consultas" text="Los datos aparecerán cuando la comunidad empiece a interactuar."/> : <div className="rank-list">{prayers.map((p, i) => <div className="rank-row" key={p[0]}><span className="rank">{i + 1}</span><div><b>{p[0]}</b><small>{p[1]}</small></div><div className="bar"><i style={{width: `${82 - i * 12}%`}}/></div><strong>{p[2]}</strong></div>)}</div>}
      </Card>
      <Card className="activity-card"><div className="card-head"><div><div className="card-title">Actividad reciente</div><div className="muted">Últimas actualizaciones</div></div></div>
        <div className="timeline"><Timeline color="red" title="Nueva donación recibida" text="María L. donó $120.000" time="Hace 18 min"/><Timeline color="blue" title="Publicación compartida" text="Reflexión del Sagrado Corazón" time="Hace 2 h"/><Timeline color="yellow" title="Oración programada" text="Hora Santa · jueves 8 oct." time="Ayer"/></div>
      </Card>
    </div>
  </>;
}

function Timeline({ color, title, text, time }: { color: string; title: string; text: string; time: string }) {
  return <div className="timeline-row"><span className={`timeline-dot ${color}`}/><div><b>{title}</b><p>{text}</p><small>{time}</small></div></div>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty"><div className="empty-icon"><Icon name="search"/></div><b>{title}</b><p>{text}</p></div>;
}

const fechaPublicacion = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${monthNames[d.getMonth()].slice(0, 3).toUpperCase()} ${d.getFullYear()}`;
};
const tituloPublicacion = (texto: string) => texto.split(/[.!?\n]/)[0].trim().slice(0, 60) || "Publicación con imágenes";
const colores = ["post-one", "post-two", "post-three"];

type ImagenNueva = { id: string; archivo: File; vista: string };

function Miniatura({ publicacion, className }: { publicacion: Publicacion; className: string }) {
  const primera = publicacion.imagenes[0];
  if (!primera) return <div className={`${className} ${colores[publicacion.id % colores.length]}`}/>;
  return <div className={`${className} con-imagen`}><img src={urlImagen(primera)} alt=""/></div>;
}

function AccionIcono({ icon, label, onClick, disabled = false, tone = "neutral" }: { icon: string; label: string; onClick: () => void; disabled?: boolean; tone?: "neutral" | "danger" }) {
  return <button type="button" className={`accion-icono${tone === "danger" ? " accion-peligro" : ""}`} aria-label={label} data-tip={label} disabled={disabled} onClick={onClick}><Icon name={icon} size={17}/></button>;
}

function Publications({ admin, notify }: { admin: Administrador; notify: (s: string) => void }) {
  const [posts, setPosts] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Publicacion | null>(null);
  const [detail, setDetail] = useState<Publicacion | null>(null);
  const [text, setText] = useState("");
  const [conservadas, setConservadas] = useState<string[]>([]);
  const [images, setImages] = useState<ImagenNueva[]>([]);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [eliminando, setEliminando] = useState<Publicacion | null>(null);
  const [borrandoId, setBorrandoId] = useState<number | null>(null);
  const [errorAccion, setErrorAccion] = useState("");
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("Más recientes");
  const imagesRef = useRef<ImagenNueva[]>([]);
  imagesRef.current = images;

  useEffect(() => {
    let activo = true;
    listarPublicaciones()
      .then(lista => { if (activo) setPosts(lista); })
      .catch((e: Error) => { if (activo) setErrorCarga(e.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  useEffect(() => () => imagesRef.current.forEach(i => URL.revokeObjectURL(i.vista)), []);

  const limpiarFormulario = () => {
    images.forEach(i => URL.revokeObjectURL(i.vista));
    setImages([]);
    setConservadas([]);
    setText("");
    setError("");
    setImageError("");
  };
  const abrir = () => { limpiarFormulario(); setErrorAccion(""); setEditando(null); setCreando(true); };
  const abrirEdicion = (p: Publicacion) => {
    limpiarFormulario();
    setErrorAccion("");
    setText(p.texto);
    setConservadas(p.imagenes);
    setEditando(p);
    setCreando(true);
  };
  const cerrar = () => { if (guardando) return; limpiarFormulario(); setEditando(null); setCreando(false); };

  const pick = (files: FileList | null) => {
    if (!files) return;
    const validas: ImagenNueva[] = [];
    const rechazadas: string[] = [];
    Array.from(files).forEach(archivo => {
      const problema = validarImagen(archivo);
      if (problema) rechazadas.push(problema);
      else if (conservadas.length + images.length + validas.length >= MAXIMO_IMAGENES) rechazadas.push(`${archivo.name}: ${MENSAJES_PUBLICACION.demasiadas}`);
      else validas.push({ id: crypto.randomUUID(), archivo, vista: URL.createObjectURL(archivo) });
    });
    setImages([...images, ...validas]);
    setImageError(rechazadas.join(" · "));
    if (validas.length) setError("");
  };
  const quitar = (imagen: ImagenNueva) => {
    URL.revokeObjectURL(imagen.vista);
    setImages(images.filter(i => i.id !== imagen.id));
  };
  const quitarConservada = (ruta: string) => setConservadas(conservadas.filter(r => r !== ruta));

  const save = async () => {
    if (guardando) return;
    if (!text.trim() && !conservadas.length && !images.length) { setError(MENSAJES_PUBLICACION.vacia); return; }
    setGuardando(true);
    setError("");
    const archivos = images.map(i => i.archivo);
    const resultado = editando ? await editarPublicacion(editando, text, conservadas, archivos) : await crearPublicacion(admin.id, text, archivos);
    setGuardando(false);
    if (resultado.estado === "error") { setError(resultado.mensaje); return; }
    if (editando) {
      setPosts(posts.map(p => p.id === resultado.publicacion.id ? resultado.publicacion : p));
      if (detail?.id === resultado.publicacion.id) setDetail(resultado.publicacion);
      notify("Publicación actualizada");
    } else {
      setPosts([resultado.publicacion, ...posts]);
      notify("Publicación creada");
    }
    limpiarFormulario();
    setEditando(null);
    setCreando(false);
  };

  const eliminar = async (p: Publicacion) => {
    setBorrandoId(p.id);
    setErrorAccion("");
    const resultado = await eliminarPublicacion(p);
    setBorrandoId(null);
    if (resultado.estado === "error") { setErrorAccion(resultado.mensaje); return; }
    setPosts(actuales => actuales.filter(x => x.id !== p.id));
    if (detail?.id === p.id) setDetail(null);
    notify("Publicación eliminada");
  };

  const restarComentario = (publicacionId: number) => {
    const restar = (p: Publicacion) => p.id === publicacionId ? { ...p, comentarios: Math.max(0, p.comentarios - 1) } : p;
    setPosts(actuales => actuales.map(restar));
    setDetail(actual => actual ? restar(actual) : actual);
  };

  const conteo = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;
  const modalEliminar = eliminando && <Modal title="Eliminar publicación" danger action="Eliminar" onClose={() => setEliminando(null)} onConfirm={() => { void eliminar(eliminando); }}><p className="modal-text">«{tituloPublicacion(eliminando.texto)}» desaparecerá del feed junto con sus {conteo(eliminando.comentarios, "comentario", "comentarios")} y {conteo(eliminando.meGusta, "«Me gusta»", "«Me gusta»")}. Esta acción no se puede deshacer.</p></Modal>;
  const avisoAccion = errorAccion && <div className="form-error" role="alert">{errorAccion}</div>;
  const totalImagenes = conservadas.length + images.length;

  if (creando) return <><PageHead title={editando ? "Editar publicación" : "Nueva publicación"} subtitle={editando ? `Publicada el ${fechaPublicacion(editando.creadoEn).toLowerCase()}. Los cambios se verán en el feed al guardar.` : "Comparte una reflexión con toda la comunidad."} action={<Button variant="secondary" icon="arrow" onClick={cerrar} disabled={guardando}>Volver</Button>}/>
    <Card className="form-card">
      <div className="form-section-title">Contenido de la publicación</div>
      <label className="field"><span>Texto</span><textarea rows={7} placeholder="Escribe aquí el mensaje para la comunidad…" value={text} disabled={guardando} onChange={e => { setText(e.target.value); setError(""); }}/></label>
      <div className="field"><span>Imágenes</span>
        <div className={`dropzone${arrastrando ? " dropzone-activa" : ""}`} onDragOver={e => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={e => { e.preventDefault(); setArrastrando(false); if (!guardando) pick(e.dataTransfer.files); }}>
          <Icon name="upload"/><b>Arrastra tus imágenes aquí</b><p>JPG o PNG · máximo 5 MB por imagen · hasta {MAXIMO_IMAGENES} imágenes</p>
          <label className="btn btn-secondary file-pick">Seleccionar imágenes<input type="file" accept="image/jpeg,image/png" multiple disabled={guardando} onChange={e => { pick(e.target.files); e.target.value = ""; }}/></label>
        </div>
        {imageError && <small>{imageError}</small>}
        {totalImagenes > 0 && <div className="image-previews">{conservadas.map((ruta, i) => <div className="image-preview" key={ruta}><img src={urlImagen(ruta)} alt={`Imagen ${i + 1} de la publicación`}/><button className="icon-btn" aria-label={`Quitar imagen ${i + 1}`} disabled={guardando} onClick={() => quitarConservada(ruta)}><Icon name="close" size={13}/></button></div>)}{images.map(imagen => <div className="image-preview" key={imagen.id}><img src={imagen.vista} alt={imagen.archivo.name}/><button className="icon-btn" aria-label={`Quitar ${imagen.archivo.name}`} disabled={guardando} onClick={() => quitar(imagen)}><Icon name="close" size={13}/></button></div>)}</div>}
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="form-actions"><Button variant="secondary" onClick={cerrar} disabled={guardando}>Cancelar</Button><Button onClick={save} disabled={guardando}>{guardando ? (editando ? "Guardando…" : "Publicando…") : (editando ? "Guardar cambios" : "Publicar ahora")}</Button></div>
    </Card></>;

  if (detail) return <><PageHead title="Detalle de publicación" subtitle={`Publicada el ${fechaPublicacion(detail.creadoEn).toLowerCase()}.`} action={<div className="head-actions"><Button variant="secondary" icon="arrow" onClick={() => { setErrorAccion(""); setDetail(null); }}>Volver</Button><Button variant="secondary" icon="edit" disabled={borrandoId === detail.id} onClick={() => abrirEdicion(detail)}>Editar</Button><Button variant="danger" disabled={borrandoId === detail.id} onClick={() => setEliminando(detail)}>{borrandoId === detail.id ? "Eliminando…" : "Eliminar"}</Button></div>}/>
    {avisoAccion}
    <div className="detail-grid">
      <Card><Miniatura publicacion={detail} className="post-hero"/><div className="post-detail-copy"><div className="eyebrow">{fechaPublicacion(detail.creadoEn)}</div><div className="card-title">{tituloPublicacion(detail.texto)}</div>{detail.texto && <p>{detail.texto}</p>}{detail.imagenes.length > 1 && <div className="post-gallery">{detail.imagenes.map(ruta => <a key={ruta} href={urlImagen(ruta)} target="_blank" rel="noreferrer"><img src={urlImagen(ruta)} alt=""/></a>)}</div>}<div className="post-metrics"><span>{detail.meGusta} Me gusta</span><span>{detail.comentarios} comentarios</span></div></div></Card>
      <ComentariosPublicacion publicacion={detail} notify={notify} onEliminado={restarComentario}/>
    </div>
    {modalEliminar}</>;

  const shown = posts.filter(p => p.texto.toLowerCase().includes(search.toLowerCase()));
  const sorted = order === "Más recientes" ? shown : [...shown].reverse();
  return <><PageHead title="Publicaciones" subtitle="Mensajes y reflexiones para la comunidad." action={<Button icon="plus" onClick={abrir}>Nueva publicación</Button>}/>
    <div className="toolbar"><div className="search"><Icon name="search" size={18}/><input placeholder="Buscar publicaciones…" value={search} onChange={e => setSearch(e.target.value)}/></div><Select value={order} onChange={setOrder}><option>Más recientes</option><option>Más antiguas</option></Select></div>
    {avisoAccion}
    <Card className="posts-list">{cargando ? <Empty title="Cargando publicaciones…" text="Un momento, por favor."/> : errorCarga ? <Empty title="No pudimos cargar las publicaciones" text={errorCarga}/> : sorted.length ? sorted.map(p => <div className="post-row" key={p.id}><Miniatura publicacion={p} className="post-thumb"/><div className="post-copy" onClick={() => setDetail(p)}><small>{fechaPublicacion(p.creadoEn)}</small><b>{tituloPublicacion(p.texto)}</b><p>{p.texto || `${p.imagenes.length} ${p.imagenes.length === 1 ? "imagen" : "imágenes"}`}</p></div><div className="post-counts"><span>{p.comentarios} comentarios</span><span>{p.meGusta} Me gusta</span></div><div className="post-acciones"><AccionIcono icon="eye" label="Ver detalle" onClick={() => setDetail(p)}/><AccionIcono icon="edit" label="Editar" disabled={borrandoId === p.id} onClick={() => abrirEdicion(p)}/><AccionIcono icon="trash" label={borrandoId === p.id ? "Eliminando…" : "Eliminar"} tone="danger" disabled={borrandoId === p.id} onClick={() => setEliminando(p)}/></div></div>) : posts.length ? <Empty title="No encontramos publicaciones" text="Prueba con otras palabras."/> : <Empty title="Aún no hay publicaciones" text="Crea la primera con «Nueva publicación»."/>}</Card>
    {modalEliminar}</>;
}

const fechaComentario = (iso: string) => {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
  return `${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()} · ${hora}`;
};
const resumenComentario = (texto: string) => texto.length > 80 ? `${texto.slice(0, 80).trim()}…` : texto;

function FilaComentario({ comentario, ocupado, borrando, onEliminar }: { comentario: Comentario; ocupado: boolean; borrando: boolean; onEliminar: () => void }) {
  const { autor } = comentario;
  return <div className="comment">
    <span className="avatar comentario-avatar">{iniciales(autor.nombre)}{autor.fotoUrl && <img src={autor.fotoUrl} alt="" onError={e => { e.currentTarget.style.display = "none"; }}/>}</span>
    <div><b>{autor.nombre}</b><small>{autor.correo ? `${autor.correo} · ` : ""}{fechaComentario(comentario.creadoEn)}</small><p>{comentario.texto}</p></div>
    <AccionIcono icon="trash" label={borrando ? "Eliminando…" : "Eliminar comentario"} tone="danger" disabled={ocupado} onClick={onEliminar}/>
  </div>;
}

function ComentariosPublicacion({ publicacion, notify, onEliminado }: { publicacion: Publicacion; notify: (s: string) => void; onEliminado: (publicacionId: number) => void }) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [intento, setIntento] = useState(0);
  const [eliminando, setEliminando] = useState<Comentario | null>(null);
  const [borrandoId, setBorrandoId] = useState<number | null>(null);
  const [errorAccion, setErrorAccion] = useState("");

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setErrorCarga("");
    listarComentarios(publicacion.id)
      .then(lista => { if (activo) setComentarios(lista); })
      .catch((e: Error) => { if (activo) setErrorCarga(e.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [publicacion.id, intento]);

  const eliminar = async (comentario: Comentario) => {
    setBorrandoId(comentario.id);
    setErrorAccion("");
    const resultado = await eliminarComentario(comentario.id);
    setBorrandoId(null);
    if (resultado.estado === "error") { setErrorAccion(resultado.mensaje); return; }
    setComentarios(actuales => actuales.filter(c => c.id !== comentario.id));
    onEliminado(publicacion.id);
    if (resultado.estado === "no_existe") { setErrorAccion(resultado.mensaje); return; }
    notify("Comentario eliminado");
  };

  const modal = eliminando && <Modal title="Eliminar comentario" danger action="Eliminar" onClose={() => setEliminando(null)} onConfirm={() => { void eliminar(eliminando); }}><p className="modal-text">Se eliminará el comentario de {eliminando.autor.nombre}: «{resumenComentario(eliminando.texto)}». Dejará de verse en la app. Esta acción no se puede deshacer.</p></Modal>;

  return <Card><div className="card-head"><div className="card-title">Comentarios</div><Badge tone="info">{cargando || errorCarga ? publicacion.comentarios : comentarios.length}</Badge></div>
    {errorAccion && <div className="form-error" role="alert">{errorAccion}</div>}
    {cargando ? <Empty title="Cargando comentarios…" text="Un momento, por favor."/>
      : errorCarga ? <><Empty title="No pudimos cargar los comentarios" text={errorCarga}/><div className="comentarios-reintentar"><Button variant="secondary" onClick={() => setIntento(n => n + 1)}>Reintentar</Button></div></>
      : comentarios.length ? <div className="comment-scroll">{comentarios.map(c => <FilaComentario key={c.id} comentario={c} ocupado={borrandoId !== null} borrando={borrandoId === c.id} onEliminar={() => setEliminando(c)}/>)}</div>
      : <Empty title="Sin comentarios" text="Cuando alguien comente esta publicación desde la app, aparecerá aquí."/>}
    {modal}</Card>;
}


const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const dayLabels = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const dayNames = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const partesDeFecha = (fecha: string) => fecha.split("-").map(Number);
const fechaLarga = (fecha: string) => { const [, mes, dia] = partesDeFecha(fecha); return `${dayNames[diaSemanaIso(fecha) - 1]} ${dia} de ${monthNames[mes - 1]}`; };
const rangoDeSemana = (lunes: string) => {
  const domingo = sumarDias(lunes, 6);
  const [, mesInicio, diaInicio] = partesDeFecha(lunes);
  const [anio, mesFin, diaFin] = partesDeFecha(domingo);
  return mesInicio === mesFin ? `${diaInicio} al ${diaFin} de ${monthNames[mesFin - 1]} de ${anio}` : `${diaInicio} de ${monthNames[mesInicio - 1]} al ${diaFin} de ${monthNames[mesFin - 1]} de ${anio}`;
};
const formularioVacio = (fecha: string, oficios: Record<number, string>): DatosOracionEnVivo => ({ fecha, hora: HORA_PREDETERMINADA, titulo: tituloSugerido(fecha, oficios), enlaceMeet: "" });
const datosDe = (oracion: OracionEnVivo): DatosOracionEnVivo => ({ fecha: oracion.fecha, hora: oracion.hora, titulo: oracion.titulo, enlaceMeet: oracion.enlaceMeet });

const horaConfirmacion = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${monthNames[d.getMonth()].slice(0, 3)} · ${d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}`;
};

function FilaAsistente({ asistente }: { asistente: Asistente }) {
  return <div>
    <span className="avatar comentario-avatar">{iniciales(asistente.nombre)}{asistente.fotoUrl && <img src={asistente.fotoUrl} alt="" onError={e => { e.currentTarget.style.display = "none"; }}/>}</span>
    <span style={{ display: "grid" }}><b>{asistente.nombre}</b>{asistente.correo && <small>{asistente.correo}</small>}</span>
    <small title="Fecha en que confirmó">{horaConfirmacion(asistente.confirmadoEn)}</small>
  </div>;
}

function AsistentesOracion({ oracion, fecha, cargandoSemana }: { oracion: OracionEnVivo | null; fecha: string; cargandoSemana: boolean }) {
  const [asistentes, setAsistentes] = useState<Asistente[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);
  const [intento, setIntento] = useState(0);
  const oracionId = oracion?.id ?? null;

  useEffect(() => {
    setAsistentes([]);
    setTotal(0);
    setErrorCarga("");
    setActualizadoEn(null);
  }, [oracionId]);

  useEffect(() => {
    if (oracionId === null) return;
    let activo = true;
    setCargando(true);
    setErrorCarga("");
    listarAsistentes(oracionId)
      .then(resultado => {
        if (!activo) return;
        setAsistentes(resultado.asistentes);
        setTotal(resultado.total);
        setActualizadoEn(new Date());
      })
      .catch((e: Error) => { if (activo) setErrorCarga(e.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [oracionId, intento]);

  useEffect(() => {
    if (oracionId === null) return;
    const alVolver = () => { if (document.visibilityState === "visible") setIntento(n => n + 1); };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [oracionId]);

  const actualizar = () => setIntento(n => n + 1);
  const subtitulo = actualizadoEn ? `Encuentro del ${fechaLarga(fecha)} · actualizado a las ${actualizadoEn.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}` : `Encuentro del ${fechaLarga(fecha)}`;
  const encabezado = <div className="card-head"><div><div className="card-title">Asistentes confirmados</div><div className="muted">{subtitulo}</div></div>{oracion && <Button variant="secondary" disabled={cargando} onClick={actualizar}>{cargando ? "Actualizando…" : "Actualizar"}</Button>}</div>;

  if (cargandoSemana) return <Card>{encabezado}<Empty title="Cargando…" text="Un momento, por favor."/></Card>;
  if (!oracion) return <Card>{encabezado}<Empty title="Sin oración programada" text="Cuando programes la oración de este día, aquí verás quiénes confirmaron asistencia desde la app."/></Card>;
  if (errorCarga) return <Card>{encabezado}<Empty title="No pudimos cargar los asistentes" text={errorCarga}/><div className="comentarios-reintentar"><Button variant="secondary" onClick={actualizar}>Reintentar</Button></div></Card>;
  if (cargando && !actualizadoEn) return <Card>{encabezado}<Empty title="Cargando asistentes…" text="Un momento, por favor."/></Card>;

  return <Card>{encabezado}
    <div className="big-count" aria-live="polite">{total}</div>
    <div className="muted">{total === 1 ? "persona confirmó asistencia" : "personas confirmaron asistencia"}</div>
    {total ? <div className="attendees attendee-scroll" style={{ marginTop: 12 }}>{asistentes.map(a => <FilaAsistente key={a.id} asistente={a}/>)}</div>
      : <Empty title="Nadie ha confirmado todavía" text="Cuando alguien confirme su asistencia desde la app, aparecerá aquí. Usa «Actualizar» para ver los cambios."/>}
  </Card>;
}

function LivePrayer({ admin, notify }: { admin: Administrador; notify: (s: string) => void }) {
  const hoy = useMemo(() => fechaDeHoyEnBogota(), []);
  const [lunes, setLunes] = useState(() => lunesDeLaSemana(hoy));
  const [seleccion, setSeleccion] = useState(hoy);
  const [oficios, setOficios] = useState<Record<number, string>>({});
  const [semana, setSemana] = useState<Record<string, OracionEnVivo>>({});
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [form, setForm] = useState<DatosOracionEnVivo>(() => formularioVacio(hoy, {}));
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [tituloEditado, setTituloEditado] = useState(false);
  const [errores, setErrores] = useState<ErroresOracionEnVivo>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [conflicto, setConflicto] = useState<OracionEnVivo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const fechaConsultada = useRef("");
  const dias = diasDeLaSemana(lunes);
  const existente = semana[seleccion] ?? null;
  const pasado = seleccion < hoy;
  const bloqueado = pasado || guardando;

  useEffect(() => {
    let activo = true;
    listarOficiosDeLaSemana()
      .then(mapa => { if (activo) setOficios(mapa); })
      .catch((e: Error) => { if (activo) setErrorCarga(e.message); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setErrorCarga("");
    listarOracionesEnVivo(lunes, sumarDias(lunes, 6))
      .then(lista => { if (activo) setSemana(Object.fromEntries(lista.map(oracion => [oracion.fecha, oracion]))); })
      .catch((e: Error) => { if (activo) setErrorCarga(e.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [lunes, recarga]);

  useEffect(() => {
    if (cargando) return;
    const oracion = semana[seleccion];
    setForm(oracion ? datosDe(oracion) : formularioVacio(seleccion, oficios));
    setEditandoId(oracion?.id ?? null);
    setTituloEditado(Boolean(oracion));
    setErrores({});
    setErrorGeneral("");
    setConflicto(null);
    fechaConsultada.current = "";
  }, [seleccion, semana, cargando]);

  useEffect(() => {
    if (editandoId === null && !tituloEditado) setForm(actual => ({ ...actual, titulo: tituloSugerido(actual.fecha, oficios) }));
  }, [oficios]);

  const abrirDia = (fecha: string) => {
    setLunes(lunesDeLaSemana(fecha));
    setSeleccion(fecha);
    setRecarga(n => n + 1);
  };
  const moverSemana = (dias: number) => {
    setLunes(sumarDias(lunes, dias));
    setSeleccion(sumarDias(seleccion, dias));
  };
  const cambiar = (campo: keyof DatosOracionEnVivo, valor: string) => {
    setForm(actual => ({ ...actual, [campo]: valor }));
    setErrores(actual => ({ ...actual, [campo]: undefined }));
    setErrorGeneral("");
  };
  const cambiarTitulo = (valor: string) => {
    setTituloEditado(true);
    cambiar("titulo", valor);
  };
  const cambiarFecha = async (fecha: string) => {
    setForm(actual => ({ ...actual, fecha, titulo: tituloEditado ? actual.titulo : tituloSugerido(fecha, oficios) }));
    setErrores(actual => ({ ...actual, fecha: undefined }));
    setErrorGeneral("");
    setConflicto(null);
    fechaConsultada.current = fecha;
    if (!esFechaValida(fecha) || fecha === existente?.fecha) return;
    const otra = semana[fecha] ?? await buscarOracionPorFecha(fecha).catch(() => null);
    if (fechaConsultada.current === fecha && otra && otra.id !== editandoId) setConflicto(otra);
  };
  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (bloqueado || conflicto) return;
    const validacion = validarOracionEnVivo(form);
    setErrores(validacion);
    setErrorGeneral("");
    if (tieneErrores(validacion)) return;
    setGuardando(true);
    const resultado = await guardarOracionEnVivo(form, admin.id, editandoId);
    setGuardando(false);
    if (resultado.estado === "ok") {
      notify(resultado.creada ? "Oración programada" : "Oración actualizada");
      abrirDia(resultado.oracion.fecha);
    } else if (resultado.estado === "invalida") {
      setErrores(resultado.errores);
    } else if (resultado.estado === "ya_existe") {
      setConflicto(resultado.oracion);
    } else if (resultado.estado === "no_existe") {
      notify(resultado.mensaje);
      setRecarga(n => n + 1);
    } else {
      setErrorGeneral(resultado.mensaje);
    }
  };

  const estado = existente ? (pasado ? "Realizada" : "Programada") : pasado ? "Sin programar" : "Pendiente";
  const tono = existente ? "success" : pasado ? "neutral" : "warning";
  const ayuda = pasado ? "Este día ya pasó; solo puedes consultar su información." : existente ? "Edita los datos de la oración programada." : "Programa el encuentro de este día. El título se llena con el oficio del día.";
  const textoBoton = guardando ? "Guardando…" : editandoId === null ? "Programar oración" : "Guardar cambios";

  return <><PageHead title="Oración en vivo" subtitle={`Semana del ${rangoDeSemana(lunes)}.`} action={<div className="head-actions"><Button variant="secondary" icon="arrow" disabled={guardando} onClick={() => moverSemana(-7)}>Semana anterior</Button><Button variant="secondary" disabled={guardando} onClick={() => moverSemana(7)}>Semana siguiente</Button>{lunes !== lunesDeLaSemana(hoy) && <Button variant="ghost" disabled={guardando} onClick={() => abrirDia(hoy)}>Esta semana</Button>}</div>}/>
    <div className="week-tabs">{dias.map((fecha, i) => <button key={fecha} type="button" className={seleccion === fecha ? "active" : ""} disabled={guardando} onClick={() => setSeleccion(fecha)}><small>{dayLabels[i]}</small><b>{partesDeFecha(fecha)[2]}</b><i className={semana[fecha] ? (fecha < hoy ? "done" : "current") : ""}/></button>)}</div>
    {errorCarga && <div className="form-error" role="alert">{errorCarga}</div>}
    <div className="detail-grid live-grid">
      <Card><div className="card-head"><div><div className="card-title">{existente?.titulo || tituloSugerido(seleccion, oficios) || "Oración en vivo"}</div><div className="muted">{cargando ? "Cargando…" : ayuda}</div></div><Badge tone={tono}>{estado}</Badge></div>
        <form onSubmit={guardar} noValidate>
          <div className="form-grid">
            <label className="field"><span>Título</span><input type="text" maxLength={LARGO_MAXIMO_TITULO} value={form.titulo} disabled={bloqueado || cargando} onChange={e => cambiarTitulo(e.target.value)}/>{errores.titulo && <small>{errores.titulo}</small>}</label>
            <label className="field"><span>Fecha</span><input type="date" min={hoy} value={form.fecha} disabled={bloqueado || cargando} onChange={e => { void cambiarFecha(e.target.value); }}/>{errores.fecha && <small>{errores.fecha}</small>}</label>
            <label className="field"><span>Hora</span><input type="time" value={form.hora} disabled={bloqueado || cargando} onChange={e => cambiar("hora", e.target.value)}/>{errores.hora && <small>{errores.hora}</small>}</label>
            <label className="field"><span>Enlace de Google Meet</span><input type="url" inputMode="url" placeholder="https://meet.google.com/abc-defg-hij" value={form.enlaceMeet} disabled={bloqueado || cargando} onChange={e => cambiar("enlaceMeet", e.target.value)}/>{errores.enlaceMeet && <small>{errores.enlaceMeet}</small>}</label>
          </div>
          {conflicto && <div className="form-error" role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><span>{MENSAJES_ORACION_EN_VIVO.yaExiste} El {fechaLarga(conflicto.fecha)} está «{conflicto.titulo}» a las {conflicto.hora}.</span><Button variant="secondary" onClick={() => abrirDia(conflicto.fecha)}>Editar esa oración</Button></div>}
          {errorGeneral && <div className="form-error" role="alert">{errorGeneral}</div>}
          {!pasado && <div className="form-actions"><Button type="submit" disabled={guardando || cargando || Boolean(conflicto)}>{textoBoton}</Button></div>}
        </form>
      </Card>
      <AsistentesOracion oracion={existente} fecha={seleccion} cargandoSemana={cargando}/>
    </div></>;
}

type LibraryTab = "Santifica el día" | "Santifica la semana" | "Santifica el mes" | "Santifica el año" | "Imágenes del widget";
type LibraryFormat = "PDF" | "YouTube" | "Imagen";
type LibraryItem = { name: string; format?: LibraryFormat; formats?: LibraryFormat[]; youtube?: string; date?: string; filled: boolean; variant?: number };
type LibraryGroup = { title: string; target: number; items: LibraryItem[]; children?: LibraryGroup[] };

const makeVariants = (prefix: string, total: number, filled: number): LibraryItem[] =>
  Array.from({ length: total }, (_, i) => ({
    name: `${prefix} ${i + 1}`,
    format: i < filled ? (i % 4 === 1 ? "YouTube" : "PDF") : undefined,
    date: i < filled ? `${12 - (i % 8)} oct. 2026` : undefined,
    filled: i < filled,
    variant: i + 1,
  }));

const libraryGroups: Record<Exclude<LibraryTab, "Imágenes del widget">, LibraryGroup[]> = {
  "Santifica el día": [
    { title: "Jaculatorias", target: 4, items: makeVariants("Jaculatorias", 4, 3) },
    { title: "Evangelio de Hoy", target: 4, items: makeVariants("Evangelio de Hoy", 4, 4) },
    { title: "Santo Rosario de Hoy", target: 4, items: makeVariants("Santo Rosario de Hoy", 4, 3) },
    { title: "Diario Espiritual", target: 4, items: makeVariants("Diario Espiritual", 4, 2) },
    { title: "Hora de reparación", target: 4, items: makeVariants("Hora de reparación", 4, 3) },
    { title: "Oración para iniciar el día", target: 2, items: [{ name: "Oración para iniciar el día 1", format: "YouTube", date: "12 oct. 2026", filled: true }, { name: "Oración para iniciar el día 2", format: "PDF", date: "12 oct. 2026", filled: true }] },
    { title: "Divina Cita", target: 1, items: [{ name: "Divina Cita", format: "PDF", date: "10 oct. 2026", filled: true }] },
    { title: "Oración de la Noche", target: 1, items: [{ name: "Oración de la Noche", format: "YouTube", date: "8 oct. 2026", filled: true }] },
  ],
  "Santifica la semana": [
    { title: "Lunes · Almas del purgatorio", target: 7, items: makeVariants("Lunes", 7, 7) },
    { title: "Martes · Santos Ángeles", target: 3, items: makeVariants("Martes", 3, 3) },
    { title: "Miércoles · Lirios de San José", target: 16, items: makeVariants("Miércoles", 16, 14) },
    { title: "Jueves · Hora Santa", target: 12, items: makeVariants("Jueves", 12, 10) },
    { title: "Viernes · Viacrucis", target: 3, items: makeVariants("Viernes", 3, 3) },
    { title: "Sábado · Hora de María", target: 3, items: [
      { name: "Hora de María · 3 de octubre", format: "PDF", date: "1 oct. 2026", filled: true },
      { name: "Hora de María · 10 de octubre", format: "PDF", date: "7 oct. 2026", filled: true },
      { name: "Hora de María · 17 de octubre", filled: false },
    ] },
    { title: "Domingo · 7 Dolores y Gozos de San José", target: 7, items: makeVariants("Domingo", 7, 6) },
  ],
  "Santifica el mes": [
    { title: "Primer jueves", target: 12, items: makeVariants("Primer jueves", 12, 11) },
    { title: "Primer viernes", target: 18, items: [], children: [
      { title: "Viernes diurnos", target: 9, items: makeVariants("Viernes diurno", 9, 8) },
      { title: "Vigilias de reparación", target: 9, items: makeVariants("Vigilia", 9, 7) },
    ] },
    { title: "Primer sábado", target: 5, items: makeVariants("Primer sábado", 5, 5) },
  ],
  "Santifica el año": [
    { title: "Consagración a San José", target: 30, items: makeVariants("Día", 30, 30) },
    { title: "Consagración a la Santísima Virgen María", target: 30, items: makeVariants("Día", 30, 30) },
    { title: "Consagración al Sagrado Corazón de Jesús", target: 30, items: makeVariants("Día", 30, 30) },
  ],
};

const fixedLimits: Record<string, number> = { "Oración para iniciar el día": 2, "Divina Cita": 1, "Oración de la Noche": 1 };

const widgetImages: LibraryItem[] = [
  { name: "Nuestra Señora del Rosario", format: "Imagen", date: "7 oct. 2026", filled: true },
  { name: "Sagrado Corazón de Jesús", format: "Imagen", date: "2 oct. 2026", filled: true },
  { name: "San José y el Niño Jesús", format: "Imagen", date: "28 sep. 2026", filled: true },
  { name: "Ángeles adoradores", format: "Imagen", date: "22 sep. 2026", filled: true },
  { name: "Jesús Eucaristía", format: "Imagen", date: "18 sep. 2026", filled: true },
];

const libraryMeta: Record<LibraryTab, { slug: string; description: string; icon: string }> = {
  "Santifica el día": { slug: "santifica-el-dia", description: "Oraciones fijas y variables de cada día", icon: "clock" },
  "Santifica la semana": { slug: "santifica-la-semana", description: "Oficios de lunes a viernes y domingo, y la Hora de María de cada sábado", icon: "calendar" },
  "Santifica el mes": { slug: "santifica-el-mes", description: "Primer jueves, primeros viernes diurnos, vigilias de reparación y primer sábado", icon: "star" },
  "Santifica el año": { slug: "santifica-el-ano", description: "Consagraciones anuales", icon: "heart" },
  "Imágenes del widget": { slug: "imagenes-del-widget", description: "Imágenes diarias del widget", icon: "library" },
};

const seccionDeTipo: Record<LibraryTab, SeccionBiblioteca> = {
  "Santifica el día": "dia",
  "Santifica la semana": "semana",
  "Santifica el mes": "mes",
  "Santifica el año": "anio",
  "Imágenes del widget": "widget",
};
const tiposBiblioteca = Object.keys(seccionDeTipo) as LibraryTab[];
const nombresDia = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const textoContenidos = (n: number) => `${n} ${n === 1 ? "contenido" : "contenidos"}`;
const fechaActualizacion = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
const fechaSabado = (fecha: string) => { const [anio, mes, dia] = partesDeFecha(fecha); return `Sábado ${dia} de ${monthNames[mes - 1]} de ${anio}`; };
const ordenarOraciones = (oraciones: OracionBiblioteca[]) => [...oraciones].sort((a, b) => Number(a.esFija) - Number(b.esFija) || a.orden - b.orden);
const proximamente = (notify: (s: string) => void, accion: string) => () => notify(`${accion} estará disponible pronto`);

function tituloOracion(oracion: OracionBiblioteca) {
  if (oracion.seccion === "semana" && oracion.diaSemana) return `${nombresDia[oracion.diaSemana - 1]} · ${oracion.nombre}`;
  return oracion.nombre;
}

function detalleOracion(oracion: OracionBiblioteca) {
  if (oracion.esFija && oracion.maxContenidos) return `Fija · ${oracion.totalContenidos} de ${oracion.maxContenidos} · se ${oracion.maxContenidos === 1 ? "muestra" : "muestran"} todos los días`;
  if (oracion.clave === "hora-maria") return `Una por cada sábado · ${textoContenidos(oracion.totalContenidos)}`;
  if (oracion.seccion === "anio") return `Días 1 a 30 · ${textoContenidos(oracion.totalContenidos)}`;
  return textoContenidos(oracion.totalContenidos);
}

function detalleContenido(contenido: ContenidoBiblioteca, oracion: OracionBiblioteca) {
  if (contenido.fecha) return fechaSabado(contenido.fecha);
  if (oracion.seccion === "anio" && contenido.numero) return `Día ${contenido.numero} de 30`;
  return "";
}

function Formatos({ formatos }: { formatos: FormatoContenido[] }) {
  return <span className="format-badges">{formatos.map(f => <Badge key={f} tone="neutral">{f}</Badge>)}</span>;
}

function VistaPrevia({ contenido, grande = false }: { contenido: ContenidoBiblioteca; grande?: boolean }) {
  const [fallo, setFallo] = useState(false);
  const imagen = !fallo ? contenido.imagenUrl ?? contenido.youtubeMiniatura : null;
  const enlace = contenido.imagenUrl ?? contenido.youtubeUrl ?? contenido.pdfUrl;
  const esVideo = !contenido.imagenUrl && !!contenido.youtubeMiniatura;
  const formato = contenido.formatos.includes("Imagen") ? "Imagen" : contenido.formatos.includes("YouTube") ? "YouTube" : "PDF";
  const icono = formato === "Imagen" ? "library" : formato === "YouTube" ? "video" : "book";
  const clase = `vista-previa ${grande ? "vista-previa-grande" : ""} vista-${formato.toLowerCase()}`;
  const cuerpo = imagen
    ? <><img src={imagen} alt={`Vista previa de ${contenido.nombre}`} loading="lazy" onError={() => setFallo(true)}/>{esVideo && <span className="vista-play"><Icon name="video" size={grande ? 22 : 14}/></span>}</>
    : <><Icon name={icono} size={grande ? 30 : 18}/>{grande && <small>Vista previa no disponible</small>}</>;
  return enlace
    ? <a className={clase} href={enlace} target="_blank" rel="noreferrer" title={`Abrir ${formato === "YouTube" ? "el video" : formato === "PDF" ? "el PDF" : "la imagen"}`}>{cuerpo}</a>
    : <span className={clase} title="El archivo todavía no está disponible">{cuerpo}</span>;
}

function Paginacion({ pagina, totalPaginas, total, mostrados, porPagina, cargando, onCambiar }: { pagina: number; totalPaginas: number; total: number; mostrados: number; porPagina: number; cargando: boolean; onCambiar: (pagina: number) => void }) {
  if (totalPaginas <= 1) return null;
  const desde = (pagina - 1) * porPagina + 1;
  return <div className="pagination library-pagination"><span>Mostrando {desde}–{desde + mostrados - 1} de {total}</span><div>
    <button disabled={cargando || pagina === 1} onClick={() => onCambiar(pagina - 1)}>Anterior</button>
    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => <button key={n} className={n === pagina ? "active" : ""} disabled={cargando} onClick={() => onCambiar(n)}>{n}</button>)}
    <button disabled={cargando || pagina === totalPaginas} onClick={() => onCambiar(pagina + 1)}>Siguiente</button>
  </div></div>;
}

function usePaginaContenidos(oracionId: number, porPagina: number) {
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaContenidos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setErrorCarga("");
    listarContenidos(oracionId, pagina, porPagina)
      .then(resultado => {
        if (!activo) return;
        setDatos(resultado);
        if (resultado.pagina !== pagina) setPagina(resultado.pagina);
      })
      .catch((e: Error) => { if (activo) setErrorCarga(e.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [oracionId, pagina, porPagina, intento]);

  return { pagina, setPagina, datos, cargando, errorCarga, reintentar: () => setIntento(n => n + 1) };
}

function FilaContenidoBiblioteca({ contenido, oracion, notify }: { contenido: ContenidoBiblioteca; oracion: OracionBiblioteca; notify: (s: string) => void }) {
  const detalle = detalleContenido(contenido, oracion);
  return <div className="library-row">
    <div className="resource-name"><VistaPrevia contenido={contenido}/><div><b>{contenido.nombre}</b>{detalle && <small>{detalle}</small>}</div></div>
    <div><Formatos formatos={contenido.formatos}/></div>
    <span className="library-date">Actualizado {fechaActualizacion(contenido.actualizadoEn)}</span>
    <div className="row-actions"><Button variant="ghost" onClick={proximamente(notify, "Editar contenidos")}>Editar</Button><Button variant="ghost" onClick={proximamente(notify, "Eliminar contenidos")}>Eliminar</Button></div>
  </div>;
}

function ContenidosOracion({ oracion, notify }: { oracion: OracionBiblioteca; notify: (s: string) => void }) {
  const { pagina, setPagina, datos, cargando, errorCarga, reintentar } = usePaginaContenidos(oracion.id, CONTENIDOS_POR_PAGINA);
  const lleno = oracion.maxContenidos !== null && (datos?.total ?? oracion.totalContenidos) >= oracion.maxContenidos;

  let lista: ReactNode;
  if (errorCarga) lista = <div className="prayer-empty"><p>{errorCarga}</p><Button variant="secondary" onClick={reintentar}>Reintentar</Button></div>;
  else if (!datos) lista = <div className="prayer-empty"><p>Cargando contenidos…</p></div>;
  else if (!datos.contenidos.length) lista = <div className="prayer-empty"><p>Aún no hay contenidos para esta oración</p></div>;
  else lista = <div className={cargando ? "library-loading" : ""} aria-busy={cargando}>{datos.contenidos.map(c => <FilaContenidoBiblioteca key={c.id} contenido={c} oracion={oracion} notify={notify}/>)}</div>;

  return <>{lista}
    {datos && <Paginacion pagina={pagina} totalPaginas={datos.totalPaginas} total={datos.total} mostrados={datos.contenidos.length} porPagina={CONTENIDOS_POR_PAGINA} cargando={cargando} onCambiar={setPagina}/>}
    {lleno
      ? <div className="accordion-limit">Esta oración admite {oracion.maxContenidos === 1 ? "un solo contenido" : `${oracion.maxContenidos} contenidos`}, que se {oracion.maxContenidos === 1 ? "muestra" : "muestran"} todos los días. Para cambiarl{oracion.maxContenidos === 1 ? "o" : "os"}, edita o elimina {oracion.maxContenidos === 1 ? "el actual" : "uno de los actuales"}.</div>
      : <div className="accordion-upload"><Button variant="secondary" icon="upload" onClick={proximamente(notify, "Subir contenidos")}>Subir nuevo</Button></div>}
  </>;
}

function ImagenesWidget({ oracion, notify }: { oracion: OracionBiblioteca; notify: (s: string) => void }) {
  const { pagina, setPagina, datos, cargando, errorCarga, reintentar } = usePaginaContenidos(oracion.id, IMAGENES_POR_PAGINA);

  if (errorCarga) return <Card><Empty title="No pudimos cargar las imágenes" text={errorCarga}/><div className="comentarios-reintentar"><Button variant="secondary" onClick={reintentar}>Reintentar</Button></div></Card>;
  if (!datos) return <Card><Empty title="Cargando imágenes…" text="Un momento, por favor."/></Card>;

  return <>
    {datos.contenidos.length
      ? <div className={`widget-grid ${cargando ? "library-loading" : ""}`} aria-busy={cargando}>{datos.contenidos.map(c => <Card key={c.id} className="widget-card"><VistaPrevia contenido={c} grande/><div className="widget-copy"><b>{c.nombre}</b><small>Actualizada {fechaActualizacion(c.actualizadoEn)}</small><div><Formatos formatos={c.formatos}/><div className="row-actions"><Button variant="ghost" onClick={proximamente(notify, "Editar contenidos")}>Editar</Button><Button variant="ghost" onClick={proximamente(notify, "Eliminar contenidos")}>Eliminar</Button></div></div></div></Card>)}</div>
      : <Card><Empty title="Aún no hay imágenes del widget" text="Cuando subas imágenes para el widget, aparecerán aquí."/></Card>}
    {datos.totalPaginas > 1 && <Card className="library-pagination-card"><Paginacion pagina={pagina} totalPaginas={datos.totalPaginas} total={datos.total} mostrados={datos.contenidos.length} porPagina={IMAGENES_POR_PAGINA} cargando={cargando} onCambiar={setPagina}/></Card>}
    <div className="widget-upload"><Button variant="secondary" icon="upload" onClick={proximamente(notify, "Subir contenidos")}>Subir nuevo</Button></div>
  </>;
}

function Library({ notify, active, onOpen, onBack }: { notify: (s: string) => void; active: LibraryTab | null; onOpen: (tab: LibraryTab) => void; onBack: () => void }) {
  const [oraciones, setOraciones] = useState<OracionBiblioteca[] | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [intento, setIntento] = useState(0);
  const [abiertas, setAbiertas] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let activo = true;
    setErrorCarga("");
    listarOracionesBiblioteca()
      .then(resultado => { if (activo) setOraciones(resultado); })
      .catch((e: Error) => { if (activo) setErrorCarga(e.message); });
    return () => { activo = false; };
  }, [intento]);

  useEffect(() => { setAbiertas({}); }, [active]);

  const totalDeTipo = (tipo: LibraryTab) => (oraciones ?? []).filter(o => o.seccion === seccionDeTipo[tipo]).reduce((suma, o) => suma + o.totalContenidos, 0);
  const estado = errorCarga
    ? <Card><Empty title="No pudimos cargar la biblioteca" text={errorCarga}/><div className="comentarios-reintentar"><Button variant="secondary" onClick={() => setIntento(n => n + 1)}>Reintentar</Button></div></Card>
    : !oraciones ? <Card><Empty title="Cargando la biblioteca…" text="Un momento, por favor."/></Card> : null;

  if (!active) {
    return <><PageHead title="Biblioteca" subtitle="Todos los recursos espirituales en un solo lugar."/>
      {estado ?? <div className="library-type-grid">{tiposBiblioteca.map((tipo, i) => <Card className="library-type-card" key={tipo}><button onClick={() => onOpen(tipo)}><span className={`type-card-icon type-${i}`}><Icon name={libraryMeta[tipo].icon} size={27}/></span><span className="type-card-title">{tipo}</span><span className="type-card-description">{libraryMeta[tipo].description}</span><span className="type-card-footer"><span><b>{totalDeTipo(tipo)}</b>{totalDeTipo(tipo) === 1 ? "contenido" : "contenidos"}</span><i><Icon name="chevron" size={18}/></i></span></button></Card>)}</div>}
    </>;
  }

  const delTipo = ordenarOraciones((oraciones ?? []).filter(o => o.seccion === seccionDeTipo[active]));
  const hayFijas = delTipo.some(o => o.esFija);

  return <><div className="library-breadcrumb"><button onClick={onBack}>Biblioteca</button><Icon name="chevron" size={14}/><span>{active}</span><Button variant="secondary" icon="arrow" onClick={onBack}>Volver</Button></div>
    <PageHead title={active} subtitle={libraryMeta[active].description}/>
    {estado ?? (active === "Imágenes del widget"
      ? delTipo[0] ? <ImagenesWidget oracion={delTipo[0]} notify={notify}/> : <Card><Empty title="Sin oración de widget" text="El catálogo no tiene la oración «Imagen del widget»."/></Card>
      : <><div className="library-groups">{delTipo.map(oracion => {
          const abierta = !!abiertas[oracion.id];
          return <Card className="library-group" key={oracion.id}>
            <button className="accordion-head simple" aria-expanded={abierta} onClick={() => setAbiertas({ ...abiertas, [oracion.id]: !abierta })}>
              <span className="accordion-icon"><Icon name={oracion.clave === "hora-maria" ? "calendar" : "book"}/></span>
              <span className="accordion-title"><b>{oracion.esFija && <span className="oracion-fija-punto" aria-label="Oración fija"/>}{tituloOracion(oracion)}</b><small>{detalleOracion(oracion)}</small></span>
              <span className={`accordion-chevron ${abierta ? "open" : ""}`}><Icon name="chevron"/></span>
            </button>
            {abierta && <div className="accordion-body"><ContenidosOracion oracion={oracion} notify={notify}/></div>}
          </Card>;
        })}</div>
        {hayFijas && <p className="oracion-fija-nota"><span className="oracion-fija-punto"/>Oración fija: se muestra todos los días y no se programa en el calendario.</p>}</>)}
  </>;
}

function Calendar({ notify }: { notify: (s:string)=>void }) {
  type CalTab = "hora" | "semana" | "mes" | "ano";
  const [selected, setSelected] = useState(3);
  const [offset, setOffset] = useState(0);
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const labels = ["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"];
  const monday = new Date(2026, 9, 5 + offset * 7);
  const days = labels.map((label, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return { label, date: d }; });
  const sunday = days[6].date;
  const isoWeek = (d: Date) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7); };
  const range = monday.getMonth() === sunday.getMonth() ? `${monday.getDate()} — ${sunday.getDate()} de ${months[sunday.getMonth()]}` : `${monday.getDate()} de ${months[monday.getMonth()].slice(0, 3)} — ${sunday.getDate()} de ${months[sunday.getMonth()].slice(0, 3)}`;
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, "Completo" | "Incompleto">>({});
  const dayKey = (i: number) => { const d = days[i].date; return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const status = (i: number): "Completo" | "Incompleto" | "Vacío" => saved[dayKey(i)] ?? (offset < 0 ? "Completo" : offset > 0 ? "Vacío" : i < 3 ? "Completo" : i < 6 ? "Incompleto" : "Vacío");
  const published = (i: number) => offset < 0 || (offset === 0 && i < 3);
  const tone = (st: string) => st === "Completo" ? "success" : st === "Incompleto" ? "warning" : "neutral";
  const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const selDate = days[selected].date;
  const [copy, setCopy] = useState(false);
  const [tab, setTab] = useState<CalTab>("hora");
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const weekday = labels[selected];
  const monthly = weekday === "JUE" || weekday === "VIE" || weekday === "SÁB";
  const activeTab: CalTab = tab === "mes" && !monthly ? "hora" : tab;
  const options = (items: LibraryItem[]) => items.filter(item => item.filled).map(item => item.name);
  const weekGroup = libraryGroups["Santifica la semana"][selected];
  const monthGroups: LibraryGroup[] = weekday === "JUE" ? [libraryGroups["Santifica el mes"][0]] : weekday === "VIE" ? libraryGroups["Santifica el mes"][1].children || [] : weekday === "SÁB" ? [libraryGroups["Santifica el mes"][2]] : [];
  const tabs: { id: CalTab; label: string }[] = [
    { id: "hora", label: "Santificar cada hora del día" },
    { id: "semana", label: "Santificar cada día de la semana" },
    ...(monthly ? [{ id: "mes" as CalTab, label: "Santificar cada mes" }] : []),
    { id: "ano", label: "Santificar cada año" },
  ];
  const pickKey = (title: string) => `${dayKey(selected)}|${title}`;
  const Row = ({ index, title, items, placeholder }: { index: number; title: string; items: string[]; placeholder: string }) =>
    <label><span><i>{index}</i><b>{title}</b></span><select value={picks[pickKey(title)] || ""} onChange={e => setPicks({ ...picks, [pickKey(title)]: e.target.value })}><option value="">{placeholder}</option>{items.map(item => <option key={item}>{item}</option>)}</select></label>;
  const saveDay = () => {
    const required = [...dayRows.map(r => r.name), "Imagen del widget", weekGroup.title.split(" · ")[1]];
    const missing = required.filter(t => !picks[pickKey(t)]);
    const result = missing.length ? "Incompleto" : "Completo";
    setSaved({ ...saved, [dayKey(selected)]: result });
    notify(missing.length ? `Programación guardada · faltan ${missing.length} ${missing.length === 1 ? "oración" : "oraciones"}, el día queda incompleto` : "Programación guardada · día completo");
  };
  const dayRows = ["Jaculatorias","Evangelio de Hoy","Santo Rosario de Hoy","Diario Espiritual","Hora de reparación"].map(name => ({ name, items: options(libraryGroups["Santifica el día"].find(g => g.title === name)?.items || []) }));
  return <><PageHead title="Calendario" subtitle="Programa el contenido diario de la app." action={<div className="head-actions"><Button variant="secondary" onClick={()=>setCopy(true)}>Copiar día o semana</Button><Button variant="secondary" icon="calendar">{capital(months[selDate.getMonth()])} {selDate.getFullYear()}</Button></div>}/>
    <div className="calendar-layout">
      <Card className="calendar-card"><div className="calendar-head"><button aria-label="Semana anterior" onClick={()=>setOffset(offset-1)}><Icon name="arrow"/></button><div><div className="card-title">{range}</div><span>Semana {isoWeek(monday)} de {sunday.getFullYear()}{offset!==0&&<> · <button className="link-today" onClick={()=>setOffset(0)}>Volver a esta semana</button></>}</span></div><button aria-label="Semana siguiente" className="flip" onClick={()=>setOffset(offset+1)}><Icon name="arrow"/></button></div><div className="cal-week">{days.map((d,i)=><button key={d.label} className={selected===i?"active":""} onClick={()=>setSelected(i)}><small>{d.label}</small><b>{d.date.getDate()}</b><i className={`cal-dot dot-${published(i)?"info":tone(status(i))}`} title={published(i)?"Publicado":status(i)}/></button>)}</div><div className="cal-legend">{([["info","Publicado"],[tone("Completo"),"Completo"],[tone("Incompleto"),"Incompleto"],[tone("Vacío"),"Vacío"]] as const).map(([t,l])=><span key={l}><i className={`cal-dot dot-${t}`}/>{l}</span>)}</div></Card>
      <Card className="day-editor">
        <div className="card-head"><div><div className="eyebrow">{capital(months[selDate.getMonth()])} {selDate.getFullYear()}</div><div className="card-title">{labels[selected].toLowerCase()}, {selDate.getDate()} de {months[selDate.getMonth()]}</div></div><Badge tone={tone(status(selected))}>{status(selected)}</Badge></div>
        <div className="calendar-tabs">{tabs.map(t=><button key={t.id} className={activeTab===t.id?"active":""} onClick={()=>setTab(t.id)}>{t.label}</button>)}</div>
        {published(selected)?<div className="locked-note"><Icon name="check"/><div><b>Este día ya se publicó</b><p>Puedes consultar su contenido, pero ya no es posible modificarlo.</p></div></div>:<div className="assignment-list">
          {activeTab==="hora"&&<>{dayRows.map((row,i)=><Row key={row.name} index={i+1} title={row.name} items={row.items} placeholder="Seleccionar desde la biblioteca…"/>)}<Row index={6} title="Imagen del widget" items={widgetImages.map(item=>item.name)} placeholder="Seleccionar desde la biblioteca…"/>{Object.keys(fixedLimits).map(name=><div className="fixed-row" key={name}><span><i/><b>{name}</b></span><span>{options(libraryGroups["Santifica el día"].find(g=>g.title===name)?.items||[]).join(" y ")||"Sin contenido en la biblioteca"}</span></div>)}<p className="fixed-note"><i/>Oración fija: se muestra todos los días y no se programa en el calendario.</p></>}
          {activeTab==="semana"&&<><p className="tab-note">Oficio de este día: <b>{weekGroup.title.split(" · ")[1]}</b>. Solo aparecen las variantes subidas a la biblioteca.</p><Row key={weekGroup.title} index={1} title={weekGroup.title.split(" · ")[1]} items={options(weekGroup.items)} placeholder="Seleccionar variante…"/></>}
          {activeTab==="mes"&&<><p className="tab-note">Asigna un oficio solo si este día es el primer {weekday==="JUE"?"jueves":weekday==="VIE"?"viernes":"sábado"} del mes. Si no lo es, déjalo vacío.</p>{monthGroups.map((group,i)=><Row key={group.title} index={i+1} title={group.title} items={options(group.items)} placeholder="Sin asignar"/>)}</>}
          {activeTab==="ano"&&<><p className="tab-note">Selecciona las consagraciones que corresponden a este día. Puedes dejarlas todas sin seleccionar.</p>{libraryGroups["Santifica el año"].map(group=>{const on=!!chosen[group.title];return <div className="consecration-row" key={group.title}><label className="check"><input type="checkbox" checked={on} onChange={()=>setChosen({...chosen,[group.title]:!on})}/><b>{group.title}</b></label>{on&&<select defaultValue=""><option value="">Seleccionar día…</option>{options(group.items).map(item=><option key={item}>{item}</option>)}</select>}</div>})}</>}
          <div className="form-actions"><Button onClick={saveDay}>Guardar programación</Button></div>
        </div>}
      </Card>
    </div>
    {copy&&<Modal title="Copiar día o semana" onClose={()=>setCopy(false)} action="Copiar contenido" onConfirm={()=>notify("Contenido copiado correctamente")}><p className="modal-text">Elige qué quieres copiar y la fecha de destino. El contenido existente no se reemplazará sin avisarte.</p><div className="segmented"><button className="active">Este día</button><button>Semana completa</button></div><Input label="Fecha de destino" type="date" value="2026-10-12"/></Modal>}
  </>;
}


const users=[["María Fernanda López","maria.lopez@gmail.com","18 sep. 2026","Activo"],["Carlos Restrepo","carlos.r@email.com","20 sep. 2026","Activo"],["Lucía Gómez","lucia.gomez@gmail.com","24 sep. 2026","Bloqueado"],["Andrés Ramírez","andres.r@email.com","1 oct. 2026","Activo"],["Administrador SC","admin@apostolado.co","4 ene. 2025","Activo"],["Santiago Herrera","santiago.herrera@gmail.com","2 oct. 2026","Activo"],["Valentina Castro","vale.castro@hotmail.com","2 oct. 2026","Activo"],["Juan Pablo Ortiz","jp.ortiz@gmail.com","3 oct. 2026","Activo"],["Camila Rojas","camila.rojas@email.com","3 oct. 2026","Activo"],["Diego Martínez","diego.mtz@gmail.com","4 oct. 2026","Bloqueado"],["Isabella Vargas","isa.vargas@gmail.com","4 oct. 2026","Activo"],["Mateo Jiménez","mateo.j@email.com","5 oct. 2026","Activo"],["Gabriela Torres","gaby.torres@gmail.com","5 oct. 2026","Activo"],["Sebastián Morales","sebas.morales@hotmail.com","6 oct. 2026","Activo"],["Daniela Suárez","dani.suarez@gmail.com","6 oct. 2026","Activo"],["Nicolás Pardo","nico.pardo@email.com","7 oct. 2026","Activo"],["Mariana Cárdenas","mariana.c@gmail.com","7 oct. 2026","Activo"],["Alejandro Ríos","alejo.rios@gmail.com","8 oct. 2026","Bloqueado"],["Paula Andrea Mejía","paula.mejia@email.com","8 oct. 2026","Activo"],["Felipe Navarro","felipe.navarro@gmail.com","8 oct. 2026","Activo"],["Laura Sofía Peña","laura.pena@gmail.com","9 oct. 2026","Activo"],["Tomás Quintero","tomas.q@email.com","9 oct. 2026","Activo"],["Ana María Duarte","anamaria.duarte@gmail.com","9 oct. 2026","Activo"]];
function Users({confirm,notify}:{confirm:(a:string,b:string,ok?:()=>void)=>void;notify:(s:string)=>void}) {
  const [list,setList]=useState(users); const [search,setSearch]=useState(""); const [page,setPage]=useState(1); const perPage=5; const filtered=list.filter(x=>(x[0]+x[1]).toLowerCase().includes(search.toLowerCase())); const pages=Math.max(1,Math.ceil(filtered.length/perPage)); const current=Math.min(page,pages); const start=(current-1)*perPage; const visible=filtered.slice(start,start+perPage);
  return <><PageHead title="Usuarios" subtitle="Personas registradas en la comunidad."/><div className="toolbar"><div className="search"><Icon name="search" size={18}/><input placeholder="Buscar por nombre o correo…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div><div className="list-count">{list.length} usuarios</div></div><Card className="table-card">{filtered.length?<table><thead><tr><th>Usuario</th><th>Correo</th><th>Fecha de registro</th><th>Estado</th><th/></tr></thead><tbody>{visible.map((u,i)=><tr key={u[1]}><td><div className="user-cell"><span className={`avatar av-${(start+i)%5}`}>{u[0].split(" ").map(x=>x[0]).slice(0,2)}</span><b>{u[0]}</b>{u[1]==="admin@apostolado.co"&&<small>Tú</small>}</div></td><td>{u[1]}</td><td>{u[2]}</td><td><Badge tone={u[3]==="Activo"?"success":"danger"}>{u[3]}</Badge></td><td><div title={u[1]==="admin@apostolado.co"?"No puedes modificar tu propia cuenta":""}><Button variant="ghost" disabled={u[1]==="admin@apostolado.co"} onClick={()=>confirm(u[3]==="Activo"?"Bloquear usuario":"Desbloquear usuario",u[3]==="Activo"?`${u[0]} no podrá iniciar sesión y se cerrarán sus sesiones activas.`:`${u[0]} podrá volver a iniciar sesión.`,()=>{setList(list.map(x=>x[1]===u[1]?[x[0],x[1],x[2],x[3]==="Activo"?"Bloqueado":"Activo"]:x));notify(u[3]==="Activo"?"Usuario bloqueado":"Usuario desbloqueado");})}>{u[3]==="Activo"?"Bloquear":"Desbloquear"}</Button><Button variant="ghost" disabled={u[1]==="admin@apostolado.co"} onClick={()=>confirm("Eliminar usuario",`Se eliminarán la cuenta de ${u[0]} y todos sus datos, y se cancelarán sus donaciones mensuales. Esta acción no se puede deshacer.`,()=>{setList(list.filter(x=>x[1]!==u[1]));notify("Usuario eliminado");})}>Eliminar</Button></div></td></tr>)}</tbody></table>:<Empty title="No encontramos usuarios" text="Revisa el nombre o correo e intenta de nuevo."/>}{filtered.length>0&&<div className="pagination"><span>Mostrando {start+1}–{start+visible.length} de {filtered.length}</span><div><button disabled={current===1} onClick={()=>setPage(current-1)}>Anterior</button>{Array.from({length:pages},(_,n)=>n+1).map(n=><button key={n} className={n===current?"active":""} onClick={()=>setPage(n)}>{n}</button>)}<button disabled={current===pages} onClick={()=>setPage(current+1)}>Siguiente</button></div></div>}</Card></>;
}

const donations: [string, string, number, string, string, string][] = [
  ["2026-10-12", "María Fernanda López", 120000, "PSE", "Única", "Aprobada"],
  ["2026-10-11", "Carlos Restrepo", 80000, "Nequi", "Mensual", "Aprobada"],
  ["2026-10-10", "Lucía Gómez", 250000, "Tarjeta", "Única", "Pendiente"],
  ["2026-10-08", "Anónimo", 50000, "DaviPlata", "Única", "Aprobada"],
  ["2026-10-05", "Sofía Martínez", 100000, "PSE", "Mensual", "Rechazada"],
  ["2026-09-28", "Andrés Ramírez", 60000, "Tarjeta", "Mensual", "Aprobada"],
];
const cop = (v: number) => "$" + v.toLocaleString("es-CO");
const shortDate = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return `${d.getDate()} ${monthNames[d.getMonth()].slice(0, 3)}. ${d.getFullYear()}`; };
function Donations() {
  const [from, setFrom] = useState("2026-10-01");
  const [to, setTo] = useState("2026-10-31");
  const [state, setState] = useState("Todos los estados");
  const [type, setType] = useState("Todos los tipos");
  const shown = donations.filter(x => x[0] >= from && x[0] <= to && (state === "Todos los estados" || x[5] === state) && (type === "Todos los tipos" || x[4] === type));
  const total = shown.filter(x => x[5] === "Aprobada").reduce((s, x) => s + x[2], 0);
  return <><PageHead title="Donaciones" subtitle="Aportes recibidos para sostener la misión."/>
    <div className="filter-card"><div><Input label="Desde" type="date" value={from} onChange={setFrom}/><Input label="Hasta" type="date" value={to} onChange={setTo}/><Select label="Estado" value={state} onChange={setState}><option>Todos los estados</option><option>Aprobada</option><option>Pendiente</option><option>Rechazada</option></Select><Select label="Tipo" value={type} onChange={setType}><option>Todos los tipos</option><option>Única</option><option>Mensual</option></Select></div><div className="filtered-total"><span>Total aprobado</span><b>{cop(total)}</b><small>{shown.length} donaciones</small></div></div>
    <Card className="table-card">{shown.length ? <table><thead><tr><th>Fecha</th><th>Donante</th><th>Monto</th><th>Medio de pago</th><th>Tipo</th><th>Estado</th></tr></thead><tbody>{shown.map(x => <tr key={x[0] + x[1]}><td>{shortDate(x[0])}</td><td>{x[1]}</td><td><b>{cop(x[2])}</b></td><td>{x[3]}</td><td>{x[4]}</td><td><Badge tone={x[5] === "Aprobada" ? "success" : x[5] === "Pendiente" ? "warning" : "danger"}>{x[5]}</Badge></td></tr>)}</tbody></table> : <Empty title="No hay donaciones con estos filtros" text="Cambia el rango de fechas, el estado o el tipo."/>}</Card></>;
}

type Book = { id: number; kind: string; title: string; author: string; category: string; price: string; format: string; units: string; description: string; details: string; cover: string; visible: boolean; orders: number; color: string };
const itemKinds = ["Libro", "Rosario", "Figura religiosa", "Medalla", "Otro"];
const initialBooks: Book[] = [
  { id: 1, kind: "Libro", title: "El camino interior", author: "Padre Andrés G.", category: "Espiritualidad", price: "48000", format: "Tapa blanda", units: "34", description: "Un itinerario de oración para la vida diaria.", details: "212 páginas · 14 × 21 cm", cover: "camino-interior.jpg", visible: true, orders: 6, color: "book-red" },
  { id: 2, kind: "Libro", title: "Orar en lo cotidiano", author: "Hna. María Clara", category: "Oración", price: "42000", format: "Tapa blanda", units: "18", description: "Pequeñas prácticas para orar en medio de la rutina.", details: "168 páginas · 13 × 20 cm", cover: "orar.jpg", visible: true, orders: 3, color: "book-blue" },
  { id: 3, kind: "Libro", title: "Cartas de esperanza", author: "Apostolado SC", category: "Devocional", price: "39000", format: "Tapa dura", units: "8", description: "Cartas para acompañar los momentos difíciles.", details: "140 páginas · 15 × 22 cm", cover: "cartas.jpg", visible: true, orders: 2, color: "book-cream" },
  { id: 4, kind: "Libro", title: "Diario de gratitud", author: "Apostolado SC", category: "Devocional", price: "35000", format: "Tapa blanda", units: "0", description: "Un diario para dar gracias cada día.", details: "120 páginas · 14 × 21 cm", cover: "diario.jpg", visible: false, orders: 0, color: "book-gold" },
  { id: 5, kind: "Rosario", title: "Rosario de madera de olivo", author: "", category: "", price: "25000", format: "", units: "40", description: "Rosario hecho a mano con cuentas de madera de olivo.", details: "Madera de olivo · 45 cm", cover: "rosario-olivo.jpg", visible: true, orders: 4, color: "item-rosario" },
  { id: 6, kind: "Figura religiosa", title: "Figura del Sagrado Corazón", author: "", category: "", price: "68000", format: "", units: "12", description: "Figura pintada a mano del Sagrado Corazón de Jesús.", details: "Resina · 20 cm de alto", cover: "figura-sc.jpg", visible: true, orders: 1, color: "item-figura" },
  { id: 7, kind: "Medalla", title: "Medalla Milagrosa", author: "", category: "", price: "15000", format: "", units: "6", description: "Medalla de la Virgen Milagrosa con cadena.", details: "Plata 925 · 1,5 cm", cover: "medalla.jpg", visible: true, orders: 0, color: "item-medalla" },
];
const kindColor: Record<string, string> = { "Rosario": "item-rosario", "Figura religiosa": "item-figura", "Medalla": "item-medalla", "Otro": "item-otro" };
const ItemThumb = ({ b }: { b: Book }) => b.kind === "Libro" ? <span className={b.color}><i>SC</i></span> : <span className={`item-thumb ${kindColor[b.kind] || "item-otro"}`}><i>{b.kind[0]}</i></span>;
const emptyBook: Book = { id: 0, kind: "Libro", title: "", author: "", category: "Espiritualidad", price: "", format: "Tapa blanda", units: "", description: "", details: "", cover: "", visible: true, orders: 0, color: "book-red" };

function Books({ confirm, notify }: { confirm: (a: string, b: string, ok?: () => void) => void; notify: (s: string) => void }) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [form, setForm] = useState<Book | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [blocked, setBlocked] = useState<Book | null>(null);
  const [removing, setRemoving] = useState<Book | null>(null);
  const [kind, setKind] = useState("Todos los tipos");
  const shown = books.filter(b => kind === "Todos los tipos" || b.kind === kind);
  const set = (k: keyof Book, v: string) => { if (form) { setForm({ ...form, [k]: v }); setErrors({ ...errors, [k]: "" }); } };
  const pickCover = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !form) return;
    const label = form.kind === "Libro" ? "La portada" : "La foto";
    if (!["image/jpeg", "image/png"].includes(file.type)) setErrors({ ...errors, cover: `${label} debe ser JPG o PNG` });
    else if (file.size > 5 * 1024 * 1024) setErrors({ ...errors, cover: `${label} supera los 5 MB` });
    else { setForm({ ...form, cover: file.name }); setErrors({ ...errors, cover: "" }); }
  };
  const save = () => {
    if (!form) return false;
    const e: Record<string, string> = {};
    const isBook = form.kind === "Libro";
    if (!form.title.trim()) e.title = isBook ? "Escribe el título" : "Escribe el nombre";
    if (isBook && !form.author.trim()) e.author = "Escribe el autor";
    if (!/^\d+$/.test(form.price.replace(/\D/g, "") ) || Number(form.price.replace(/\D/g, "")) <= 0) e.price = "Ingresa un precio mayor a cero";
    if (!/^\d+$/.test(form.units) ) e.units = "Ingresa un número de unidades válido";
    if (!form.description.trim()) e.description = "Escribe una descripción";
    if (!form.cover) e.cover = e.cover || (isBook ? "Sube la portada" : "Sube una foto");
    setErrors(e);
    if (Object.values(e).some(Boolean)) return false;
    const clean = { ...form, price: form.price.replace(/\D/g, "") };
    if (form.id) { setBooks(books.map(b => b.id === form.id ? clean : b)); notify("Artículo actualizado"); }
    else { setBooks([...books, { ...clean, id: Date.now(), color: isBook ? clean.color : kindColor[clean.kind] || "item-otro" }]); notify("Artículo agregado a la tienda"); }
    setForm(null);
    return true;
  };
  const toggle = (b: Book) => { setBooks(books.map(x => x.id === b.id ? { ...x, visible: !x.visible } : x)); notify(b.visible ? "El artículo ya no se muestra en la tienda" : "El artículo vuelve a mostrarse en la tienda"); };
  return <><PageHead title="Tienda" subtitle="Libros y artículos religiosos disponibles para la comunidad." action={<Button icon="plus" onClick={() => { setForm(emptyBook); setErrors({}); }}>Agregar artículo</Button>}/>
    <div className="toolbar filters"><Select value={kind} onChange={setKind}><option>Todos los tipos</option>{itemKinds.map(k => <option key={k}>{k}</option>)}</Select><span>{shown.length} {shown.length === 1 ? "artículo" : "artículos"}</span></div>
    <Card className="table-card">{shown.length ? <table><thead><tr><th>Artículo</th><th>Tipo</th><th>Precio</th><th>Unidades</th><th>Estado</th><th/></tr></thead><tbody>{shown.map(b => <tr key={b.id}><td><div className="book-cell"><ItemThumb b={b}/><div className="item-name"><b>{b.title}</b>{b.kind === "Libro" && <small>{b.author}</small>}</div></div></td><td><Badge tone="neutral">{b.kind}</Badge></td><td><b>{cop(Number(b.price))}</b></td><td><Badge tone={Number(b.units) > 10 ? "success" : Number(b.units) > 0 ? "warning" : "danger"}>{Number(b.units) > 0 ? `${b.units} disponibles` : "Agotado"}</Badge></td><td><Badge tone={b.visible ? "success" : "neutral"}>{b.visible ? "Visible" : "Oculto"}</Badge></td><td><div className="row-actions"><Button variant="ghost" onClick={() => { setForm(b); setErrors({}); }}>Editar</Button><Button variant="ghost" onClick={() => toggle(b)}>{b.visible ? "Ocultar" : "Mostrar"}</Button><Button variant="ghost" onClick={() => b.orders ? setBlocked(b) : setRemoving(b)}>Eliminar</Button></div></td></tr>)}</tbody></table> : <Empty title="No hay artículos de este tipo" text="Agrega uno nuevo o cambia el filtro."/>}</Card>
    {form && <Modal title={form.id ? "Editar artículo" : "Agregar artículo"} onClose={() => setForm(null)} action={form.id ? "Guardar cambios" : "Guardar artículo"} onConfirm={save}>
      <div className="form-grid">
        <label className="field full"><span>Tipo de artículo *</span><select value={form.kind} disabled={!!form.id} onChange={e => { setForm({ ...form, kind: e.target.value }); setErrors({}); }}>{itemKinds.map(k => <option key={k}>{k}</option>)}</select>{!!form.id && <em className="field-hint">El tipo no se puede cambiar después de crear el artículo.</em>}</label>
        {form.kind === "Libro" ? <>
        <Input label="Título *" placeholder="Título del libro" value={form.title} onChange={v => set("title", v)} error={errors.title}/>
        <Input label="Autor *" placeholder="Nombre del autor" value={form.author} onChange={v => set("author", v)} error={errors.author}/>
        <Select label="Categoría *" value={form.category || "Espiritualidad"} onChange={v => set("category", v)}><option>Espiritualidad</option><option>Oración</option><option>Devocional</option></Select>
        <Input label="Precio (COP) *" placeholder="$ 0" value={form.price} onChange={v => set("price", v)} error={errors.price}/>
        <Select label="Formato *" value={form.format || "Tapa blanda"} onChange={v => set("format", v)}><option>Tapa blanda</option><option>Tapa dura</option></Select>
        <Input label="Unidades disponibles *" type="number" placeholder="0" value={form.units} onChange={v => set("units", v)} error={errors.units}/>
        </> : <>
        <label className="field full"><span>Nombre *</span><input placeholder={`Nombre del artículo (ej. ${form.kind === "Rosario" ? "Rosario de madera" : form.kind === "Medalla" ? "Medalla de San Benito" : form.kind === "Figura religiosa" ? "Figura de San José" : "Vela de la Divina Misericordia"})`} value={form.title} onChange={e => set("title", e.target.value)}/>{errors.title && <small>{errors.title}</small>}</label>
        <Input label="Precio (COP) *" placeholder="$ 0" value={form.price} onChange={v => set("price", v)} error={errors.price}/>
        <Input label="Unidades disponibles *" type="number" placeholder="0" value={form.units} onChange={v => set("units", v)} error={errors.units}/>
        </>}
        <label className="field full"><span>Descripción *</span><textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)}/>{errors.description && <small>{errors.description}</small>}</label>
        <label className="field full"><span>Detalles</span><textarea rows={2} placeholder={form.kind === "Libro" ? "Páginas, dimensiones, editorial…" : "Material, medidas, color…"} value={form.details} onChange={e => set("details", e.target.value)}/></label>
        <div className="field full"><span>{form.kind === "Libro" ? "Portada *" : "Foto del artículo *"}</span>{form.cover ? <div className="file-chip"><Icon name="library" size={16}/><b>{form.cover}</b><button className="icon-btn" aria-label="Quitar imagen" onClick={() => setForm({ ...form, cover: "" })}><Icon name="close" size={14}/></button></div> : <div className="drawer-dropzone"><Icon name="upload"/><b>{form.kind === "Libro" ? "Selecciona o arrastra la portada" : "Selecciona o arrastra la foto"}</b><p>JPG o PNG · máximo 5 MB</p><label className="btn btn-secondary file-pick">Seleccionar archivo<input type="file" accept="image/jpeg,image/png" onChange={e => { pickCover(e.target.files); e.target.value = ""; }}/></label></div>}{errors.cover && <small>{errors.cover}</small>}</div>
      </div>
    </Modal>}
    {blocked && <Modal title="No se puede eliminar" onClose={() => setBlocked(null)} action="Ocultar artículo" onConfirm={() => { if (blocked.visible) toggle(blocked); }}><p className="modal-text">«{blocked.title}» tiene pedidos asociados, por eso no se puede eliminar. Puedes ocultarlo para que deje de aparecer en la tienda sin perder sus pedidos.</p></Modal>}
    {removing && <Modal title="Eliminar artículo" danger action="Eliminar" onClose={() => setRemoving(null)} onConfirm={() => { setBooks(books.filter(b => b.id !== removing.id)); notify("Artículo eliminado"); }}><p className="modal-text">«{removing.title}» se eliminará de la tienda. Esta acción no se puede deshacer.</p></Modal>}
  </>;
}

type Order = { id: string; date: string; buyer: string; email: string; phone: string; address: string; book: string; qty: number; subtotal: number; shipping: number; pay: string; ship: string };
const initialOrders: Order[] = [
  { id: "SC-2026-1052", date: "2026-10-12", buyer: "María F. López", email: "maria.lopez@gmail.com", phone: "+57 310 456 7890", address: "Carrera 12 # 84-21, Apto. 402, Bogotá", book: "El camino interior", qty: 1, subtotal: 48000, shipping: 12000, pay: "Aprobado", ship: "Pagado" },
  { id: "SC-2026-1051", date: "2026-10-10", buyer: "Carlos Restrepo", email: "carlos.r@email.com", phone: "+57 315 220 1188", address: "Calle 45 # 23-10, Medellín", book: "Orar en lo cotidiano", qty: 2, subtotal: 84000, shipping: 12000, pay: "Aprobado", ship: "Enviado" },
  { id: "SC-2026-1050", date: "2026-10-08", buyer: "Lucía Gómez", email: "lucia.gomez@gmail.com", phone: "+57 300 781 4420", address: "Avenida 6N # 28-50, Cali", book: "Cartas de esperanza", qty: 1, subtotal: 39000, shipping: 12000, pay: "Pendiente", ship: "Pagado" },
  { id: "SC-2026-1049", date: "2026-10-04", buyer: "Sofía Martínez", email: "sofia.m@email.com", phone: "+57 312 640 9031", address: "Carrera 53 # 76-120, Barranquilla", book: "Rosario de madera de olivo", qty: 1, subtotal: 25000, shipping: 12000, pay: "Aprobado", ship: "Entregado" },
  { id: "SC-2026-1048", date: "2026-09-29", buyer: "Jorge Cárdenas", email: "jorge.c@email.com", phone: "+57 318 905 3377", address: "Calle 10 # 4-32, Bucaramanga", book: "El camino interior", qty: 1, subtotal: 48000, shipping: 12000, pay: "Rechazado", ship: "Pagado" },
];

function Orders({ notify }: { notify: (s: string) => void }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [detail, setDetail] = useState<string | null>(null);
  const [pay, setPay] = useState("Todos los pagos");
  const [ship, setShip] = useState("Todos los envíos");
  const [from, setFrom] = useState("2026-09-01");
  const [to, setTo] = useState("2026-10-31");
  const [next, setNext] = useState("");
  const shown = orders.filter(o => o.date >= from && o.date <= to && (pay === "Todos los pagos" || o.pay === pay) && (ship === "Todos los envíos" || o.ship === ship));
  const o = orders.find(x => x.id === detail);
  if (o) return <><PageHead title={`Pedido #${o.id}`} subtitle={`Realizado el ${shortDate(o.date)}.`} action={<Button variant="secondary" icon="arrow" onClick={() => setDetail(null)}>Volver</Button>}/>
    <div className="detail-grid order-detail">
      <Card><div className="card-title">Resumen del pedido</div><div className="order-book"><span className="book-red"><i>SC</i></span><div><b>{o.book}</b><p>Cantidad: {o.qty}</p></div><strong>{cop(o.subtotal)}</strong></div><div className="receipt"><span>Subtotal <b>{cop(o.subtotal)}</b></span><span>Envío <b>{cop(o.shipping)}</b></span><span>Total <b>{cop(o.subtotal + o.shipping)}</b></span></div></Card>
      <Card><div className="card-title">Datos de envío</div><dl><dt>Comprador</dt><dd>{o.buyer}</dd><dt>Correo</dt><dd>{o.email}</dd><dt>Teléfono</dt><dd>{o.phone}</dd><dt>Dirección</dt><dd>{o.address}</dd></dl></Card>
      <Card className="shipping-card"><div className="card-title">Estado del envío</div><Badge tone={o.pay === "Aprobado" ? "success" : o.pay === "Pendiente" ? "warning" : "danger"}>Pago {o.pay.toLowerCase()}</Badge><Select label="Actualizar estado" value={next || o.ship} onChange={setNext}><option>Pagado</option><option>Enviado</option><option>Entregado</option></Select><Button disabled={o.pay !== "Aprobado"} onClick={() => { setOrders(orders.map(x => x.id === o.id ? { ...x, ship: next || x.ship } : x)); notify("Estado del envío actualizado"); }}>Guardar estado</Button>{o.pay !== "Aprobado" && <small>El pago debe estar aprobado para actualizar el envío.</small>}</Card>
    </div></>;
  return <><PageHead title="Pedidos" subtitle="Compras y envíos de la tienda."/>
    <div className="toolbar filters"><Select value={pay} onChange={setPay}><option>Todos los pagos</option><option>Aprobado</option><option>Pendiente</option><option>Rechazado</option></Select><Select value={ship} onChange={setShip}><option>Todos los envíos</option><option>Pagado</option><option>Enviado</option><option>Entregado</option></Select><Input type="date" value={from} onChange={setFrom}/><span>hasta</span><Input type="date" value={to} onChange={setTo}/></div>
    <Card className="table-card">{shown.length ? <table><thead><tr><th>Pedido</th><th>Fecha</th><th>Comprador</th><th>Artículos</th><th>Total</th><th>Pago</th><th>Envío</th><th/></tr></thead><tbody>{shown.map(x => <tr key={x.id}><td>#{x.id}</td><td>{shortDate(x.date)}</td><td>{x.buyer}</td><td>{x.book} × {x.qty}</td><td><b>{cop(x.subtotal + x.shipping)}</b></td><td><Badge tone={x.pay === "Aprobado" ? "success" : x.pay === "Pendiente" ? "warning" : "danger"}>{x.pay}</Badge></td><td><Badge tone={x.ship === "Entregado" ? "success" : "info"}>{x.ship}</Badge></td><td><Button variant="ghost" onClick={() => { setDetail(x.id); setNext(""); }}>Ver detalle <Icon name="chevron" size={15}/></Button></td></tr>)}</tbody></table> : <Empty title="No hay pedidos con estos filtros" text="Cambia el estado o el rango de fechas."/>}</Card></>;
}

function PortalApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const libraryType = (Object.keys(libraryMeta) as LibraryTab[]).find(tab => location.pathname === `/biblioteca/${libraryMeta[tab].slug}`) || null;
  const [admin, setAdmin] = useState<Administrador | null>(null);
  const [verificando, setVerificando] = useState(true);
  const destino = useRef("/");
  useEffect(() => {
    let activo = true;
    restaurarSesion().then(administrador => {
      if (!activo) return;
      setAdmin(administrador);
      setVerificando(false);
    });
    const dejarDeEscuchar = escucharCierreDeSesion(() => setAdmin(null));
    return () => {
      activo = false;
      dejarDeEscuchar();
    };
  }, []);
  useEffect(() => {
    if (verificando) return;
    if (!admin && location.pathname !== "/ingreso") {
      destino.current = location.pathname;
      navigate("/ingreso", { replace: true });
    } else if (admin && location.pathname === "/ingreso") {
      navigate(destino.current || "/", { replace: true });
    }
  }, [admin, verificando, location.pathname, navigate]);
  const salir = async () => {
    await cerrarSesion();
    destino.current = "/";
    setSection("Resumen");
    setAdmin(null);
  };
  const [section, setSection] = useState<Section>(location.pathname.startsWith("/biblioteca") ? "Biblioteca" : "Resumen");
  const [modal, setModal] = useState<{title:string;text:string;ok?:()=>void}|null>(null);
  const [toast, setToast] = useState("");
  const notify=(text:string)=>{setToast(text);window.setTimeout(()=>setToast(""),2800)};
  const confirm=(title:string,text:string,ok?:()=>void)=>setModal({title,text,ok});
  const content=useMemo(()=>{
    if(section==="Resumen") return <Summary/>;
    if(section==="Publicaciones") return admin ? <Publications admin={admin} notify={notify}/> : null;
    if(section==="Oración en vivo") return admin ? <LivePrayer admin={admin} notify={notify}/> : null;
    if(section==="Biblioteca") return <Library notify={notify} active={libraryType} onOpen={tab=>navigate(`/biblioteca/${libraryMeta[tab].slug}`)} onBack={()=>navigate("/biblioteca")}/>;
    if(section==="Calendario") return <Calendar notify={notify}/>;
    if(section==="Usuarios") return <Users confirm={confirm} notify={notify}/>;
    if(section==="Donaciones") return <Donations/>;
    if(section==="Tienda") return <Books confirm={confirm} notify={notify}/>;
    return <Orders notify={notify}/>;
  },[section, location.pathname, admin]);
  if(verificando) return <div className="login-shell" style={{display:"grid",placeItems:"center",color:"var(--warm)"}}>Cargando…</div>;
  if(!admin) return <Login onLogin={setAdmin}/>;
  return <div className="app-shell">
    <aside>
      <div className="side-brand"><img className="side-logo" src={logo} alt=""/><div><small className="side-kicker">Escuela de los</small><b>Sagrados Corazones</b></div></div>
      <nav>{sections.map(s=><button className={section===s.name?"active":""} key={s.name} onClick={()=>{setSection(s.name);navigate(s.name==="Biblioteca"?"/biblioteca":"/");}}><Icon name={s.icon}/><span>{s.name}</span>{section===s.name&&<i/>}</button>)}</nav>
      <div className="side-account">
        <span className="avatar">{iniciales(admin.nombre)}</span>
        <div><b>{admin.nombre}</b><small>{admin.correo}</small></div>
        <button onClick={()=>confirm("¿Cerrar sesión?","Tendrás que volver a ingresar con tu correo y contraseña para gestionar el portal.",salir)}>Cerrar sesión</button>
      </div>
    </aside>
    <div className="main-wrap">
      <header><div><span className="header-section">{section}</span><span className="breadcrumb">Portal administrador</span></div></header>
      <main className="content">{content}</main>
    </div>
    {modal&&<Modal title={modal.title} onClose={()=>setModal(null)} action={modal.title.startsWith("No se")?"Ocultar artículo":"Confirmar"} danger={!modal.title.startsWith("No se")} onConfirm={()=>{if(modal.ok)modal.ok();else notify("Acción realizada correctamente");}}><div className="confirm-icon"><Icon name="close"/></div><p className="modal-text">{modal.text}</p></Modal>}
    {toast&&<Toast text={toast}/>}
  </div>;
}

const router = createHashRouter([{ path: "*", Component: PortalApp }]);

export default function App() {
  return <RouterProvider router={router}/>;
}
