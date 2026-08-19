import {
  requireSaasFeature,
} from "@/lib/saasAccess";


export default async function CrmAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  await requireSaasFeature(
    "ai"
  );

  return children;
}
