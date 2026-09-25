import {
  NextResponse,
} from "next/server";


export const dynamic =
  "force-dynamic";


export const revalidate =
  0;


export async function GET() {

  const version =
    process.env
      .NEXT_PUBLIC_APROVUP_DEPLOYMENT_ID ||
    "unknown";


  return NextResponse.json(
    {
      version,
    },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",

        Pragma:
          "no-cache",

        Expires:
          "0",
      },
    }
  );
}
