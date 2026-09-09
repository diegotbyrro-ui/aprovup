import {
  syncSecretaryApprovalAlerts,
  syncSecretaryPublicationAlerts,
} from '@/lib/secretaryMonitor';

import {
  deliverSecretaryAlertsToWhatsapp,
  deliverSecretaryDailyBriefs,
  processPendingWhatsappEvents,
} from '@/lib/secretaryWhatsApp';


export async function runSecretaryAutomation() {
  const whatsappInbound =
    await processPendingWhatsappEvents(
      10
    )
      .catch(
        (
          error
        ) => {
          console.error(
            'SECRETARY WHATSAPP INBOUND ERROR',
            error
          );

          return 0;
        }
      );


  const publications =
    await syncSecretaryPublicationAlerts()
      .catch(
        (
          error
        ) => {
          console.error(
            'SECRETARY PUBLICATION MONITOR ERROR',
            error
          );

          return null;
        }
      );


  const approvals =
    await syncSecretaryApprovalAlerts()
      .catch(
        (
          error
        ) => {
          console.error(
            'SECRETARY APPROVAL MONITOR ERROR',
            error
          );

          return null;
        }
      );


  const alertDeliveries =
    await deliverSecretaryAlertsToWhatsapp()
      .catch(
        (
          error
        ) => {
          console.error(
            'SECRETARY WHATSAPP DELIVERY ERROR',
            error
          );

          return 0;
        }
      );


  const dailyBriefs =
    await deliverSecretaryDailyBriefs()
      .catch(
        (
          error
        ) => {
          console.error(
            'SECRETARY DAILY BRIEF ERROR',
            error
          );

          return 0;
        }
      );


  return {
    whatsappInbound,
    publications,
    approvals,
    alertDeliveries,
    dailyBriefs,
  };
}
