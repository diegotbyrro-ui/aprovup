import {
  MeetAddonSidePanelClient,
} from './MeetAddonSidePanelClient';


export const dynamic =
  'force-dynamic';


export default function MeetAddonSidePanelPage() {

  const cloudProjectNumber =
    String(
      process.env
        .GOOGLE_MEET_ADDON_PROJECT_NUMBER ||
      process.env
        .NEXT_PUBLIC_GOOGLE_MEET_ADDON_PROJECT_NUMBER ||
      ''
    ).trim();


  return (
    <MeetAddonSidePanelClient
      cloudProjectNumber={
        cloudProjectNumber
      }
    />
  );
}
