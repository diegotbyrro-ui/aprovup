import {
  requireSaasFeature,
} from "@/lib/saasAccess";


export default async function CrmProspectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  await requireSaasFeature(
    "ai"
  );

  return children;
}
