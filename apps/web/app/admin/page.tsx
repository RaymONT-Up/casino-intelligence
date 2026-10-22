import { api, isEditor, type ResearchState } from "../../lib/server";
import { SourceWorkspace, Login } from "./workspace";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Source workspace",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  if (!(await isEditor())) return <Login />;
  return (
    <SourceWorkspace state={await api<ResearchState>("/admin/research")} />
  );
}
