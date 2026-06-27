// Mock data for Portal Neurobaeza UI Kit
// Spanish names, Colombian context, status keys match the codebase.

window.MOCK_USERS = [
  { username: "carolina.lopez", password: "demo", nombre: "Carolina López", rol: "admin",      avatar: "🛡️" },
  { username: "andres.ruiz",    password: "demo", nombre: "Andrés Ruiz",   rol: "th",         avatar: "👥" },
  { username: "demo",           password: "demo", nombre: "Demo User",     rol: "superadmin", avatar: "🔑" },
];

window.ROLE_LABELS = {
  superadmin: "🔑 Super Admin",
  admin: "🛡️ Administrador",
  th: "👥 Talento Humano",
  sst: "🦺 SST",
  nomina: "💰 Nómina",
  viewer: "👁️ Visualizador",
};

window.STATUS_MAP = {
  NUEVO:               { label: "NUEVO",            color: "#3B82F6", icon: "clock"        },
  EN_REVISION:         { label: "EN REVISIÓN",      color: "#06B6D4", icon: "search"       },
  INCOMPLETA:          { label: "INCOMPLETA",       color: "#DC2626", icon: "x-circle"     },
  ILEGIBLE:            { label: "ILEGIBLE",         color: "#F59E0B", icon: "alert-circle" },
  EPS_TRANSCRIPCION:   { label: "EN VALIDACIÓN",    color: "#CA8A04", icon: "file-text"    },
  DERIVADO_TTHH:       { label: "POSIBLE FRAUDE",   color: "#DC2626", icon: "alert-circle" },
  COMPLETA:            { label: "VALIDADA",         color: "#16A34A", icon: "check-circle" },
  CAUSA_EXTRA:         { label: "EXTRA",            color: "#6B7280", icon: "edit-3"       },
};

window.TIPO_MAP = {
  enfermedad_general:  "Enfermedad general",
  maternidad:          "Maternidad",
  paternidad:          "Paternidad",
  accidente_transito:  "Accidente de tránsito",
  enfermedad_laboral:  "Enfermedad laboral",
};

window.EMPRESAS = [
  "Neurobaeza SAS", "Inversiones Andes SA", "Constructora del Sur",
  "Grupo Logístico Caribe", "Servicios Médicos del Valle",
];

window.STATS = {
  nuevos: 147, en_revision: 38, incompletas: 23,
  ilegibles: 11, posible_fraude: 4, validadas: 412,
};

window.MOCK_CASOS = [
  { id: 1, serial: "NB-2026-00471-MAT", nombre: "Carolina López Mendoza",     cedula: "1.012.388.471", empresa: "Neurobaeza SAS",           tipo: "maternidad",         estado: "COMPLETA",          fecha_inicio: "12 nov 2026", fecha_fin: "10 may 2027", dias: 126, created_at: "2026-11-12", reenvios: 0, bloquea: false },
  { id: 2, serial: "NB-2026-00472-EG",  nombre: "Andrés Felipe Ruiz",         cedula: "1.020.111.092", empresa: "Inversiones Andes SA",     tipo: "enfermedad_general", estado: "INCOMPLETA",        fecha_inicio: "11 nov 2026", fecha_fin: "13 nov 2026", dias:   3, created_at: "2026-11-11", reenvios: 2, bloquea: true  },
  { id: 3, serial: "NB-2026-00473-AT",  nombre: "Sandra Milena Páez",         cedula: "52.876.214",    empresa: "Servicios Médicos Valle",  tipo: "accidente_transito", estado: "ILEGIBLE",          fecha_inicio: "10 nov 2026", fecha_fin: "20 nov 2026", dias:  11, created_at: "2026-11-10", reenvios: 0, bloquea: false },
  { id: 4, serial: "NB-2026-00474-EG",  nombre: "Juan Camilo Restrepo",       cedula: "1.144.029.881", empresa: "Constructora del Sur",     tipo: "enfermedad_general", estado: "NUEVO",             fecha_inicio: "13 nov 2026", fecha_fin: "15 nov 2026", dias:   3, created_at: "2026-11-13", reenvios: 0, bloquea: false },
  { id: 5, serial: "NB-2026-00475-EG",  nombre: "Diana Marcela Ortiz",        cedula: "39.554.107",    empresa: "Grupo Logístico Caribe",   tipo: "enfermedad_general", estado: "EPS_TRANSCRIPCION", fecha_inicio: "08 nov 2026", fecha_fin: "11 nov 2026", dias:   4, created_at: "2026-11-08", reenvios: 1, bloquea: false },
  { id: 6, serial: "NB-2026-00476-EL",  nombre: "Felipe Hernández Salazar",   cedula: "80.214.665",    empresa: "Inversiones Andes SA",     tipo: "enfermedad_laboral", estado: "DERIVADO_TTHH",     fecha_inicio: "05 nov 2026", fecha_fin: "—",          dias:   8, created_at: "2026-11-05", reenvios: 0, bloquea: true  },
  { id: 7, serial: "NB-2026-00477-MAT", nombre: "Laura Catalina Vargas",      cedula: "1.018.402.336", empresa: "Neurobaeza SAS",           tipo: "maternidad",         estado: "COMPLETA",          fecha_inicio: "01 nov 2026", fecha_fin: "30 abr 2027", dias: 126, created_at: "2026-11-01", reenvios: 0, bloquea: false },
  { id: 8, serial: "NB-2026-00478-PAT", nombre: "Ricardo Mauricio Bermúdez",  cedula: "79.881.024",    empresa: "Servicios Médicos Valle",  tipo: "paternidad",         estado: "NUEVO",             fecha_inicio: "14 nov 2026", fecha_fin: "27 nov 2026", dias:  14, created_at: "2026-11-14", reenvios: 0, bloquea: false },
  { id: 9, serial: "NB-2026-00479-EG",  nombre: "Mónica Alejandra Torres",    cedula: "43.221.987",    empresa: "Constructora del Sur",     tipo: "enfermedad_general", estado: "COMPLETA",          fecha_inicio: "03 nov 2026", fecha_fin: "06 nov 2026", dias:   4, created_at: "2026-11-03", reenvios: 0, bloquea: false },
];
