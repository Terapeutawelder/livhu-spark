import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAppointments from "./tools/list-appointments";
import scheduleAppointment from "./tools/schedule-appointment";
import listContacts from "./tools/list-contacts";
import createContact from "./tools/create-contact";
import listServices from "./tools/list-services";
import listConversations from "./tools/list-conversations";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "livhub",
  title: "LivHub",
  version: "0.1.0",
  instructions:
    "Ferramentas do LivHub, plataforma de gestão para psicoterapeutas. Permite consultar e criar agendamentos, consultar e criar contatos/pacientes, listar serviços de terapia e ver conversas recentes. Todas as operações rodam no consultório do usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listAppointments,
    scheduleAppointment,
    listContacts,
    createContact,
    listServices,
    listConversations,
  ],
});
