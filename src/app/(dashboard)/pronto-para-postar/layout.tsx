import {
  requirePermission,
} from "@/lib/userAccess";


export default async function ReadyToPostAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  await requirePermission(
    "social.view"
  );

  return children;
}
